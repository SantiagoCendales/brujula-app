import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import { pool, withTransaction } from '../db/pool.js';
import { vehicleScope } from '../domain/access.js';
import {
  ensureActiveTechnician,
  findVisibleActivity,
  getActivityDetail,
  listActivities,
  recordEvent,
  transition,
} from '../domain/activities.js';
import { ACTIVITY_TYPES, STATUSES } from '../domain/rules.js';
import { HttpError } from '../lib/errors.js';
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

  res.status(201).json({ activity: await getActivityDetail(pool, activityId, user) });
});

const assignSchema = z.object({ technician_id: z.number().int().positive() });

activitiesRouter.post('/:id/assign', requireRole('coordinator', 'admin'), async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const { technician_id: technicianId } = validate(assignSchema, req.body);

  await findVisibleActivity(pool, id, req.user);
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

  res.json({ activity: await getActivityDetail(pool, id, req.user) });
});
