import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, ensurePermission, requireRole } from '../auth/middleware.js';
import { pool, withTransaction } from '../db/pool.js';
import { recordEvent } from '../domain/activities.js';
import { createRejectionNotifications } from '../domain/notifications.js';
import { ACTIVITY_TYPES } from '../domain/rules.js';
import { HttpError } from '../lib/errors.js';
import { absolutePhotoPath, deletePhotoFile, detectImageType, savePhotoFile } from '../lib/photos.js';
import { idSchema, validate } from '../lib/validation.js';
import { notifyActivityChanged, notifyVehicleRequestChanged } from '../realtime/activityEvents.js';

export const vehicleRequestsRouter = Router();
vehicleRequestsRouter.use(authenticate);

const UNIQUE_VIOLATION = '23505';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const REQUEST_SELECT = `
  select r.*, c.name as company_name, u.name as requested_by_name, rv.name as reviewed_by_name,
         previous.review_note as previous_review_note,
         exists (select 1 from vehicle_requests followup where followup.resubmitted_from_id = r.id) as has_resubmission
  from vehicle_requests r
  join companies c on c.id = r.company_id
  join users u on u.id = r.requested_by
  left join users rv on rv.id = r.reviewed_by
  left join vehicle_requests previous on previous.id = r.resubmitted_from_id`;

function toRequest(row) {
  return {
    id: row.id,
    status: row.status,
    plate: row.plate,
    make: row.make,
    model: row.model,
    vin: row.vin,
    year: row.year,
    color: row.color,
    type: row.type,
    description: row.description,
    location: row.location,
    city: row.city,
    department: row.department,
    scheduled_for: row.scheduled_for,
    review_note: row.review_note,
    resubmitted_from_id: row.resubmitted_from_id,
    previous_review_note: row.previous_review_note,
    has_resubmission: row.has_resubmission,
    vehicle_id: row.vehicle_id,
    activity_id: row.activity_id,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
    has_ownership_photo: Boolean(row.ownership_photo_key),
    company: { id: row.company_id, name: row.company_name },
    requested_by: { id: row.requested_by, name: row.requested_by_name },
    reviewed_by: row.reviewed_by ? { id: row.reviewed_by, name: row.reviewed_by_name } : null,
  };
}

async function getRequest(db, id) {
  const { rows } = await db.query(`${REQUEST_SELECT} where r.id = $1`, [id]);
  return rows[0];
}

const listQuerySchema = z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() });

// A client sees its company's requests; staff see all of them.
vehicleRequestsRouter.get('/', requireRole('client', 'coordinator', 'admin'), async (req, res) => {
  const { status } = validate(listQuerySchema, req.query);
  const params = [];
  const conditions = ['true'];
  if (req.user.role === 'client') {
    params.push(req.user.company_id);
    conditions.push(`r.company_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }
  const { rows } = await pool.query(
    `${REQUEST_SELECT} where ${conditions.join(' and ')} order by r.id desc limit 200`,
    params,
  );
  res.json({ requests: rows.map(toRequest) });
});

vehicleRequestsRouter.get('/:id', async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const { rows } = await pool.query(
    `${REQUEST_SELECT} where r.id = $1 and
     ($2::text in ('admin', 'coordinator') or ($2 = 'client' and r.company_id = $3))`,
    [id, req.user.role, req.user.company_id],
  );
  if (!rows[0]) throw new HttpError(404, 'not_found', 'Solicitud no encontrada');
  res.json({ request: toRequest(rows[0]) });
});

vehicleRequestsRouter.get('/:id/ownership-photo', async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const { rows } = await pool.query(
    `select ownership_photo_key, ownership_photo_mime_type from vehicle_requests
     where id = $1 and ($2::text in ('admin', 'coordinator') or ($2 = 'client' and company_id = $3))`,
    [id, req.user.role, req.user.company_id],
  );
  const photo = rows[0];
  if (!photo?.ownership_photo_key) throw new HttpError(404, 'not_found', 'Foto no encontrada');
  res.set('Cache-Control', 'private, no-store');
  res.type(photo.ownership_photo_mime_type);
  res.sendFile(absolutePhotoPath(photo.ownership_photo_key));
});

const optionalText = (max) => z.string().trim().max(max).default('').transform((value) => value || null);

const createSchema = z.object({
  plate: z.string().trim().min(1).max(20).transform((plate) => plate.toUpperCase().replace(/\s+/g, '')),
  make: z.string().trim().max(60).default(''),
  model: z.string().trim().max(60).default(''),
  vin: optionalText(40),
  year: z.number().int().min(0).max(9999).nullish(),
  color: optionalText(40),
  type: z.enum(ACTIVITY_TYPES),
  description: z.string().trim().max(2000).default(''),
  location: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  department: z.string().trim().min(1).max(100),
  scheduled_for: z.iso.datetime({ offset: true }),
  resubmitted_from_id: z.number().int().positive().optional(),
}).strict();

function validateRequest(schema, payload) {
  const result = schema.safeParse(payload);
  if (result.success) return result.data;
  const labels = {
    plate: 'Placa', make: 'Marca', model: 'Modelo', vin: 'VIN', year: 'Año', color: 'Color',
    type: 'Tipo de servicio', description: 'Descripción', location: 'Dirección', city: 'Ciudad',
    department: 'Departamento', scheduled_for: 'Fecha y hora',
  };
  const details = result.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  const fields = [...new Set(details.map((detail) => labels[detail.field] ?? 'Solicitud'))];
  throw new HttpError(400, 'validation_error', `Revisa los siguientes datos: ${fields.join(', ')}`, details);
}

vehicleRequestsRouter.post('/', requireRole('client'), async (req, _res, next) => {
  await ensurePermission(req.user, 'create_activity');
  next();
}, upload.single('ownership_photo'), async (req, res) => {
  let payload;
  try {
    payload = JSON.parse(req.body.data);
  } catch {
    throw new HttpError(400, 'validation_error', 'Los datos de la solicitud no tienen un formato válido');
  }
  const data = validateRequest(createSchema, payload);
  if (!req.file) throw new HttpError(400, 'validation_error', 'Adjunta una foto de la tarjeta de propiedad');
  const imageType = detectImageType(req.file.buffer);
  if (!imageType) throw new HttpError(400, 'validation_error', 'La foto de la tarjeta debe ser JPEG, PNG o WebP');

  if (data.resubmitted_from_id) {
    const { rows } = await pool.query(
      'select status from vehicle_requests where id = $1 and company_id = $2',
      [data.resubmitted_from_id, req.user.company_id],
    );
    if (!rows[0]) throw new HttpError(404, 'not_found', 'Solicitud no encontrada');
    if (rows[0].status !== 'rejected') {
      throw new HttpError(409, 'invalid_status', 'Solo puedes corregir solicitudes rechazadas');
    }
    const { rows: resubmissions } = await pool.query(
      'select 1 from vehicle_requests where resubmitted_from_id = $1',
      [data.resubmitted_from_id],
    );
    if (resubmissions.length) {
      throw new HttpError(409, 'already_resubmitted', 'Esta solicitud ya fue corregida y enviada nuevamente');
    }
  }

  const { rows: ownVehicles } = await pool.query(
    'select 1 from vehicles where plate = $1 and company_id = $2',
    [data.plate, req.user.company_id],
  );
  if (ownVehicles.length) {
    throw new HttpError(409, 'plate_exists', 'Esa placa ya está en tu flota. Elígela al crear una solicitud de servicio.');
  }

  const storageKey = `${req.user.company_id}/vehicle-requests/${randomUUID()}.${imageType.extension}`;
  await savePhotoFile(storageKey, req.file.buffer);
  let requestId;
  try {
    const { rows } = await pool.query(
      `insert into vehicle_requests
         (company_id, requested_by, plate, make, model, vin, year, color, type, description, location, scheduled_for,
          city, department,
          ownership_photo_key, ownership_photo_mime_type, resubmitted_from_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) returning id`,
      [
        req.user.company_id, req.user.id, data.plate, data.make, data.model, data.vin, data.year ?? null, data.color,
        data.type, data.description, data.location, data.scheduled_for, data.city, data.department, storageKey, imageType.mimeType,
        data.resubmitted_from_id ?? null,
      ],
    );
    requestId = rows[0].id;
  } catch (error) {
    await deletePhotoFile(storageKey);
    if (error.code === UNIQUE_VIOLATION) {
      if (error.constraint === 'vehicle_requests_resubmitted_from_idx') {
        throw new HttpError(409, 'already_resubmitted', 'Esta solicitud ya fue corregida y enviada nuevamente');
      }
      throw new HttpError(409, 'request_pending', 'Ya enviaste una solicitud pendiente para esa placa');
    }
    throw error;
  }

  notifyVehicleRequestChanged({
    requestId, companyId: req.user.company_id, change: 'vehicle_request_created', actorId: req.user.id,
  });
  res.status(201).json({ request: toRequest(await getRequest(pool, requestId)) });
});

const approveSchema = createSchema.pick({ location: true, city: true, department: true, scheduled_for: true }).partial().strict();

vehicleRequestsRouter.post('/:id/approve', requireRole('coordinator', 'admin'), async (req, res) => {
  const id = validate(idSchema, req.params.id);
  await ensurePermission(req.user, 'create_vehicle');
  await ensurePermission(req.user, 'create_activity');
  const changes = validateRequest(approveSchema, req.body ?? {});

  const activityId = await withTransaction(async (db) => {
    const { rows } = await db.query('select * from vehicle_requests where id = $1 for update', [id]);
    const request = rows[0];
    if (!request) throw new HttpError(404, 'not_found', 'Solicitud no encontrada');
    if (request.status !== 'pending') {
      throw new HttpError(409, 'invalid_status', 'La solicitud ya fue revisada', { status: request.status });
    }
    const requestedSchedule = {
      city: request.city, department: request.department, location: request.location, scheduled_for: request.scheduled_for,
    };
    const approvedSchedule = { ...requestedSchedule, ...changes };

    let vehicleId;
    try {
      ({ rows: [{ id: vehicleId }] } = await db.query(
        `insert into vehicles (company_id, plate, make, model, vin, year, color)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [request.company_id, request.plate, request.make, request.model, request.vin, request.year, request.color],
      ));
    } catch (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw new HttpError(409, 'plate_exists', 'Esa placa ya está registrada en el sistema. Rechaza la solicitud o revisa el vehículo existente.');
      }
      throw error;
    }

    const { rows: [{ id: newActivityId }] } = await db.query(
      `insert into activities (company_id, vehicle_id, type, description, location, city, department, scheduled_for, status, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'requested', $9) returning id`,
      [
        request.company_id, vehicleId, request.type, request.description, approvedSchedule.location,
        approvedSchedule.city, approvedSchedule.department, approvedSchedule.scheduled_for,
        request.requested_by,
      ],
    );
    // The client's own request, recorded without notifying staff: they just handled it.
    await db.query(
      `insert into activity_events (activity_id, user_id, type, to_status, data) values ($1, $2, 'created', 'requested', $3)`,
      [newActivityId, request.requested_by, { vehicle_request_id: id }],
    );
    await recordEvent(db, {
      activityId: newActivityId,
      userId: req.user.id,
      type: 'request_approved',
      data: { vehicle_request_id: id, vehicle_id: vehicleId, requested: requestedSchedule, approved: approvedSchedule },
    });
    await db.query(
      `update vehicle_requests
       set status = 'approved', reviewed_by = $2, reviewed_at = now(), vehicle_id = $3, activity_id = $4
       where id = $1`,
      [id, req.user.id, vehicleId, newActivityId],
    );
    return newActivityId;
  });

  const request = await getRequest(pool, id);
  await notifyActivityChanged(pool, activityId, { change: 'request_approved', actorId: req.user.id });
  notifyVehicleRequestChanged({
    requestId: id, companyId: request.company_id, change: 'vehicle_request_approved', actorId: req.user.id,
  });
  res.json({ request: toRequest(request) });
});

const rejectSchema = z.object({ note: z.string().trim().min(3).max(1000) }).strict();

vehicleRequestsRouter.post('/:id/reject', requireRole('coordinator', 'admin'), async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const { note } = validate(rejectSchema, req.body);
  await ensurePermission(req.user, 'create_vehicle');

  const request = await withTransaction(async (db) => {
    const { rows } = await db.query(
      `update vehicle_requests set status = 'rejected', review_note = $2, reviewed_by = $3, reviewed_at = now()
       where id = $1 and status = 'pending' returning id`,
      [id, note, req.user.id],
    );
    if (!rows.length) {
      const existing = await getRequest(db, id);
      if (!existing) throw new HttpError(404, 'not_found', 'Solicitud no encontrada');
      throw new HttpError(409, 'invalid_status', 'La solicitud ya fue revisada', { status: existing.status });
    }
    await createRejectionNotifications(db, { requestId: id, userId: req.user.id });
    return getRequest(db, id);
  });
  notifyVehicleRequestChanged({
    requestId: id, companyId: request.company_id, change: 'vehicle_request_rejected', actorId: req.user.id,
  });
  res.json({ request: toRequest(request) });
});
