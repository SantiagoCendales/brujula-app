import { activityScope } from './access.js';
import { TECHNICIAN_HISTORY_STATUSES, TECHNICIAN_PENDING_STATUSES } from './rules.js';

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
