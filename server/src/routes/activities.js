import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import { pool, withTransaction } from '../db/pool.js';
import { vehicleScope } from '../domain/access.js';
import {
  ensureActiveTechnician,
  ensureHolder,
  ensureReportComplete,
  findVisibleActivity,
  getActivityDetail,
  invalidStatus,
  listActivities,
  lockActivity,
  NOW,
  recordEvent,
  transition,
} from '../domain/activities.js';
import {
  ACTIVITY_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_ACTIVITY,
  MAX_REPORT_LENGTH,
  MAX_RETURN_NOTE_LENGTH,
  PHOTO_CATEGORIES,
  STATUSES,
  TECHNICIAN_EDITABLE_STATUSES,
} from '../domain/rules.js';
import { HttpError } from '../lib/errors.js';
import { notifyActivityChanged } from '../realtime/activityEvents.js';
import { deletePhotoFile, detectImageType, savePhotoFile } from '../lib/photos.js';
import { idSchema, validate } from '../lib/validation.js';

export const activitiesRouter = Router();
activitiesRouter.use(authenticate);

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  vehicle_id: idSchema.optional(),
  technician_id: idSchema.optional(),
  company_id: idSchema.optional(),
  view: z.enum(['pending', 'history']).optional(),
});

activitiesRouter.get('/', async (req, res) => {
  const filters = validate(listQuerySchema, req.query);
  res.json({ activities: await listActivities(pool, req.user, filters) });
});

activitiesRouter.get('/:id', async (req, res) => {
  const id = validate(idSchema, req.params.id);
  res.json({ activity: await getActivityDetail(pool, id, req.user) });
});

const createSchema = z.object({
  vehicle_id: z.number().int().positive(),
  type: z.enum(ACTIVITY_TYPES),
  description: z.string().trim().max(2000).default(''),
  scheduled_for: z.iso.datetime({ offset: true }).nullish(),
  technician_id: z.number().int().positive().nullish(),
});

activitiesRouter.post('/', requireRole('client', 'coordinator', 'admin'), async (req, res) => {
  const data = validate(createSchema, req.body);
  const user = req.user;

  if (data.technician_id && user.role === 'client') {
    throw new HttpError(403, 'forbidden', 'Un cliente no puede asignar técnicos');
  }

  const params = [data.vehicle_id];
  const scope = vehicleScope(user, params);
  const { rows: vehicles } = await pool.query(`select v.id, v.company_id from vehicles v where v.id = $1 and ${scope}`, params);
  const vehicle = vehicles[0];
  if (!vehicle) throw new HttpError(404, 'not_found', 'Vehículo no encontrado');

  if (data.technician_id) await ensureActiveTechnician(pool, data.technician_id);

  const activityId = await withTransaction(async (db) => {
    const { rows } = await db.query(
      `insert into activities (company_id, vehicle_id, type, description, scheduled_for, status, created_by, technician_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [
        vehicle.company_id,
        vehicle.id,
        data.type,
        data.description,
        data.scheduled_for ?? null,
        data.technician_id ? 'assigned' : 'requested',
        user.id,
        data.technician_id ?? null,
      ],
    );
    const id = rows[0].id;
    await recordEvent(db, { activityId: id, userId: user.id, type: 'created', toStatus: 'requested' });
    if (data.technician_id) {
      await recordEvent(db, {
        activityId: id,
        userId: user.id,
        type: 'assigned',
        fromStatus: 'requested',
        toStatus: 'assigned',
        data: { technician_id: data.technician_id },
      });
    }
    return id;
  });

  await respondAfterChange(res, activityId, user, 'created', { status: 201 });
});

const assignSchema = z.object({ technician_id: z.number().int().positive() });

activitiesRouter.post('/:id/assign', requireRole('coordinator', 'admin'), async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const { technician_id: technicianId } = validate(assignSchema, req.body);

  const { technician_id: previousTechnicianId } = await findVisibleActivity(pool, id, req.user);
  await ensureActiveTechnician(pool, technicianId);
  await withTransaction((db) =>
    transition(db, {
      activityId: id,
      userId: req.user.id,
      from: ['requested', 'assigned'],
      to: 'assigned',
      type: 'assigned',
      changes: { technician_id: technicianId },
      data: { technician_id: technicianId },
    }),
  );

  await respondAfterChange(res, id, req.user, 'assigned', { previousTechnicianId });
});

const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy_m: z.number().min(0).max(100_000).nullish(),
});

// Every mutation ends here: tell the live screens first, then answer with the updated activity.
async function respondAfterChange(res, activityId, user, change, { status = 200, previousTechnicianId, extra } = {}) {
  await notifyActivityChanged(pool, activityId, { change, actorId: user.id, previousTechnicianId });
  res.status(status).json({ ...extra, activity: await getActivityDetail(pool, activityId, user) });
}

activitiesRouter.post('/:id/arrive', requireRole('technician'), async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const coordinates = validate(coordinatesSchema, req.body);
  ensureHolder(await findVisibleActivity(pool, id, req.user), req.user);

  await withTransaction((db) =>
    transition(db, {
      activityId: id,
      userId: req.user.id,
      from: ['assigned'],
      to: 'on_site',
      type: 'arrived',
      changes: {
        arrived_at: NOW,
        arrival_lat: coordinates.lat,
        arrival_lng: coordinates.lng,
        arrival_accuracy_m: coordinates.accuracy_m ?? null,
        performed_by: req.user.id,
      },
    }),
  );
  await respondAfterChange(res, id, req.user, 'arrived');
});

const reportSchema = z.object({ report: z.string().max(MAX_REPORT_LENGTH) });

activitiesRouter.patch('/:id/report', requireRole('technician'), async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const { report } = validate(reportSchema, req.body);
  ensureHolder(await findVisibleActivity(pool, id, req.user), req.user);

  await withTransaction(async (db) => {
    const activity = await lockActivity(db, id);
    if (!TECHNICIAN_EDITABLE_STATUSES.includes(activity.status)) throw invalidStatus(activity.status);
    await db.query('update activities set report = $2, updated_at = now() where id = $1', [id, report]);
    if (activity.status === 'returned' && activity.report !== report) {
      await recordEvent(db, {
        activityId: id,
        userId: req.user.id,
        type: 'correction',
        data: { field: 'report', before: activity.report, after: report },
      });
    }
  });
  await respondAfterChange(res, id, req.user, 'report_updated');
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 5 },
});

// Runs before multer so a request without permission is rejected before its file is read.
async function loadActivityForUpload(req, _res, next) {
  const id = validate(idSchema, req.params.id);
  const activity = await findVisibleActivity(pool, id, req.user);
  ensureHolder(activity, req.user);
  if (!TECHNICIAN_EDITABLE_STATUSES.includes(activity.status)) throw invalidStatus(activity.status);
  req.activity = activity;
  next();
}

const photoFieldsSchema = z.object({ category: z.enum(PHOTO_CATEGORIES) });

activitiesRouter.post(
  '/:id/photos',
  requireRole('technician'),
  loadActivityForUpload,
  upload.single('photo'),
  async (req, res) => {
    const { category } = validate(photoFieldsSchema, req.body);
    if (!req.file) throw new HttpError(400, 'validation_error', 'Falta la foto', [{ field: 'photo', message: 'Requerida' }]);

    const imageType = detectImageType(req.file.buffer);
    if (!imageType) throw new HttpError(400, 'validation_error', 'La foto tiene que ser JPEG, PNG o WebP');

    const { activity } = req;
    // Company and activity in the key make every file traceable to its owner.
    const storageKey = `${activity.company_id}/${activity.id}/${randomUUID()}.${imageType.extension}`;
    await savePhotoFile(storageKey, req.file.buffer);

    try {
      const photoId = await withTransaction(async (db) => {
        const locked = await lockActivity(db, activity.id);
        if (!TECHNICIAN_EDITABLE_STATUSES.includes(locked.status)) throw invalidStatus(locked.status);
        const { rows: counts } = await db.query('select count(*)::int as total from photos where activity_id = $1', [activity.id]);
        if (counts[0].total >= MAX_PHOTOS_PER_ACTIVITY) {
          throw new HttpError(409, 'too_many_photos', `Máximo ${MAX_PHOTOS_PER_ACTIVITY} fotos por actividad`);
        }
        const { rows } = await db.query(
          `insert into photos (activity_id, category, storage_key, mime_type, size_bytes, uploaded_by)
           values ($1, $2, $3, $4, $5, $6) returning id`,
          [activity.id, category, storageKey, imageType.mimeType, req.file.size, req.user.id],
        );
        if (locked.status === 'returned') {
          await recordEvent(db, {
            activityId: activity.id,
            userId: req.user.id,
            type: 'photo_added',
            data: { photo_id: rows[0].id, category },
          });
        }
        return rows[0].id;
      });
      await respondAfterChange(res, activity.id, req.user, 'photo_added', { status: 201, extra: { photo_id: photoId } });
    } catch (error) {
      await deletePhotoFile(storageKey);
      throw error;
    }
  },
);

activitiesRouter.post('/:id/finish', requireRole('technician'), async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const coordinates = validate(coordinatesSchema, req.body);
  ensureHolder(await findVisibleActivity(pool, id, req.user), req.user);

  await withTransaction(async (db) => {
    const activity = await lockActivity(db, id);
    if (activity.status !== 'on_site') throw invalidStatus(activity.status);
    await ensureReportComplete(db, activity);
    await transition(db, {
      activityId: id,
      userId: req.user.id,
      from: ['on_site'],
      to: 'report_ready',
      type: 'finished',
      changes: {
        finished_at: NOW,
        finish_lat: coordinates.lat,
        finish_lng: coordinates.lng,
        finish_accuracy_m: coordinates.accuracy_m ?? null,
        technician_id: null,
      },
    });
  });
  await respondAfterChange(res, id, req.user, 'finished');
});

activitiesRouter.post('/:id/validate', requireRole('cec', 'admin'), async (req, res) => {
  const id = validate(idSchema, req.params.id);
  await findVisibleActivity(pool, id, req.user);
  await withTransaction((db) =>
    transition(db, { activityId: id, userId: req.user.id, from: ['report_ready'], to: 'validated', type: 'validated' }),
  );
  await respondAfterChange(res, id, req.user, 'validated');
});

const returnSchema = z.object({ note: z.string().trim().min(3).max(MAX_RETURN_NOTE_LENGTH) });

// CEC sends the report back to the technician who performed it, with a note saying what to fix.
activitiesRouter.post('/:id/return', requireRole('cec', 'admin'), async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const { note } = validate(returnSchema, req.body);
  const activity = await findVisibleActivity(pool, id, req.user);
  await withTransaction((db) =>
    transition(db, {
      activityId: id,
      userId: req.user.id,
      from: ['report_ready'],
      to: 'returned',
      type: 'returned',
      changes: { technician_id: activity.performed_by },
      note,
    }),
  );
  await respondAfterChange(res, id, req.user, 'returned');
});

// No GPS here: corrections can be made away from the site. The original arrival and finish stay as evidence.
activitiesRouter.post('/:id/resubmit', requireRole('technician'), async (req, res) => {
  const id = validate(idSchema, req.params.id);
  ensureHolder(await findVisibleActivity(pool, id, req.user), req.user);

  await withTransaction(async (db) => {
    const activity = await lockActivity(db, id);
    if (activity.status !== 'returned') throw invalidStatus(activity.status);
    await ensureReportComplete(db, activity);
    await transition(db, {
      activityId: id,
      userId: req.user.id,
      from: ['returned'],
      to: 'report_ready',
      type: 'resubmitted',
      changes: { technician_id: null },
    });
  });
  await respondAfterChange(res, id, req.user, 'resubmitted');
});

activitiesRouter.post('/:id/deliver', requireRole('coordinator', 'admin'), async (req, res) => {
  const id = validate(idSchema, req.params.id);
  await findVisibleActivity(pool, id, req.user);
  await withTransaction((db) =>
    transition(db, { activityId: id, userId: req.user.id, from: ['validated'], to: 'delivered', type: 'delivered' }),
  );
  await respondAfterChange(res, id, req.user, 'delivered');
});
