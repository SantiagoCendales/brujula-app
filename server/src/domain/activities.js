import { HttpError } from '../lib/errors.js';
import { signedPhotoUrl } from '../lib/photos.js';
import { activityScope } from './access.js';
import {
  CLIENT_REPORT_VISIBLE_STATUSES,
  REQUIRED_PHOTOS,
  TECHNICIAN_HISTORY_STATUSES,
  TECHNICIAN_PENDING_STATUSES,
} from './rules.js';

export const ACTIVITY_SELECT = `
  select a.*, v.plate, v.make, v.model, c.name as company_name,
         t.name as technician_name, p.name as performed_by_name
  from activities a
  join vehicles v on v.id = a.vehicle_id
  join companies c on c.id = a.company_id
  left join users t on t.id = a.technician_id
  left join users p on p.id = a.performed_by`;

function person(id, name) {
  return id ? { id, name } : null;
}

export function toActivitySummary(row) {
  return {
    id: row.id,
    status: row.status,
    type: row.type,
    description: row.description,
    scheduled_for: row.scheduled_for,
    created_at: row.created_at,
    updated_at: row.updated_at,
    company: { id: row.company_id, name: row.company_name },
    vehicle: { id: row.vehicle_id, plate: row.plate, make: row.make, model: row.model },
    technician: person(row.technician_id, row.technician_name),
    performed_by: person(row.performed_by, row.performed_by_name),
  };
}

function toPhoto(row) {
  return {
    id: row.id,
    category: row.category,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    uploaded_at: row.uploaded_at,
    url: signedPhotoUrl(row.id),
  };
}

function toEvent(row) {
  return {
    id: row.id,
    type: row.type,
    from_status: row.from_status,
    to_status: row.to_status,
    note: row.note,
    data: row.data,
    created_at: row.created_at,
    user: { id: row.user_id, name: row.user_name },
  };
}

function location(at, lat, lng, accuracy) {
  return at ? { at, lat, lng, accuracy_m: accuracy } : null;
}

const EQUALITY_FILTERS = ['status', 'vehicle_id', 'technician_id', 'company_id'];

export async function listActivities(db, user, filters = {}) {
  const params = [];
  const conditions = [activityScope(user, params)];

  for (const column of EQUALITY_FILTERS) {
    if (filters[column] === undefined) continue;
    params.push(filters[column]);
    conditions.push(`a.${column} = $${params.length}`);
  }

  if (user.role === 'technician' && filters.view) {
    const isPending = filters.view === 'pending';
    params.push(user.id);
    conditions.push(`a.${isPending ? 'technician_id' : 'performed_by'} = $${params.length}`);
    params.push(isPending ? TECHNICIAN_PENDING_STATUSES : TECHNICIAN_HISTORY_STATUSES);
    conditions.push(`a.status = any($${params.length}::activity_status[])`);
  }

  const { rows } = await db.query(
    `${ACTIVITY_SELECT} where ${conditions.join(' and ')} order by a.created_at desc limit 200`,
    params,
  );
  return rows.map(toActivitySummary);
}

// Answers 404 both when the activity does not exist and when the user may not see it.
export async function findVisibleActivity(db, id, user) {
  const params = [id];
  const scope = activityScope(user, params);
  const { rows } = await db.query(`${ACTIVITY_SELECT} where a.id = $1 and ${scope}`, params);
  if (!rows[0]) throw new HttpError(404, 'not_found', 'Actividad no encontrada');
  return rows[0];
}

export async function getActivityDetail(db, id, user) {
  const row = await findVisibleActivity(db, id, user);
  const isClient = user.role === 'client';
  const reportVisible = !isClient || CLIENT_REPORT_VISIBLE_STATUSES.includes(row.status);

  const photos = reportVisible
    ? (await db.query('select * from photos where activity_id = $1 order by uploaded_at, id', [id])).rows
    : [];
  const events = isClient
    ? []
    : (
        await db.query(
          `select e.*, u.name as user_name from activity_events e
           join users u on u.id = e.user_id
           where e.activity_id = $1 order by e.created_at, e.id`,
          [id],
        )
      ).rows;
  const photoCategories = new Set(photos.map((photo) => photo.category));

  return {
    ...toActivitySummary(row),
    arrival: location(row.arrived_at, row.arrival_lat, row.arrival_lng, row.arrival_accuracy_m),
    finish: location(row.finished_at, row.finish_lat, row.finish_lng, row.finish_accuracy_m),
    report: reportVisible ? row.report : null,
    photos: photos.map(toPhoto),
    missing_photos: isClient ? [] : REQUIRED_PHOTOS.filter((category) => !photoCategories.has(category)),
    events: events.map(toEvent),
  };
}

export async function recordEvent(db, { activityId, userId, type, fromStatus = null, toStatus = null, note = null, data = null }) {
  await db.query(
    `insert into activity_events (activity_id, user_id, type, from_status, to_status, note, data)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [activityId, userId, type, fromStatus, toStatus, note, data],
  );
}

// Use as a value in `changes` to store the server's clock, never the device's.
export const NOW = Symbol('now');

export function invalidStatus(currentStatus) {
  return new HttpError(409, 'invalid_status', 'La actividad no está en un estado que permita esta acción', {
    status: currentStatus,
  });
}

export async function lockActivity(db, activityId) {
  const { rows } = await db.query('select * from activities where id = $1 for update', [activityId]);
  return rows[0];
}

// Moves an activity to a new status inside a transaction: locks the row, checks the current status
// is one of `from`, applies `changes` and records the event. `changes` keys are column names from our code.
export async function transition(db, { activityId, userId, from, to, type, changes = {}, note = null, data = null }) {
  const { status: currentStatus } = await lockActivity(db, activityId);
  if (!from.includes(currentStatus)) throw invalidStatus(currentStatus);

  const params = [activityId, to];
  const assignments = ['status = $2', 'updated_at = now()'];
  for (const [column, value] of Object.entries(changes)) {
    if (value === NOW) {
      assignments.push(`${column} = now()`);
      continue;
    }
    params.push(value);
    assignments.push(`${column} = $${params.length}`);
  }
  await db.query(`update activities set ${assignments.join(', ')} where id = $1`, params);
  await recordEvent(db, { activityId, userId, type, fromStatus: currentStatus, toStatus: to, note, data });
}

// Technicians can see past work and vehicle history, but only act on what they hold right now.
export function ensureHolder(activity, user) {
  if (activity.technician_id !== user.id) {
    throw new HttpError(403, 'forbidden', 'Esta actividad no está asignada a ti');
  }
}

export async function ensureReportComplete(db, activity) {
  const { rows } = await db.query('select distinct category from photos where activity_id = $1', [activity.id]);
  const present = new Set(rows.map((row) => row.category));
  const missingPhotos = REQUIRED_PHOTOS.filter((category) => !present.has(category));
  const missingReport = activity.report.trim() === '';
  if (missingPhotos.length > 0 || missingReport) {
    throw new HttpError(422, 'incomplete_report', 'Faltan datos para cerrar el informe', {
      missing_photos: missingPhotos,
      missing_report: missingReport,
    });
  }
}

export async function ensureActiveTechnician(db, technicianId) {
  const { rows } = await db.query('select role, active from users where id = $1', [technicianId]);
  const technician = rows[0];
  if (technician?.role !== 'technician' || !technician.active) {
    throw new HttpError(400, 'validation_error', 'El técnico no existe o no está activo', [
      { field: 'technician_id', message: 'Técnico inválido' },
    ]);
  }
}
