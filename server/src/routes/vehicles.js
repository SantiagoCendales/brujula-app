import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import { pool } from '../db/pool.js';
import { vehicleScope } from '../domain/access.js';
import { listActivities } from '../domain/activities.js';
import { HttpError } from '../lib/errors.js';
import { escapeLike, idSchema, validate } from '../lib/validation.js';

export const vehiclesRouter = Router();
vehiclesRouter.use(authenticate);

const VEHICLE_SELECT = 'select v.*, c.name as company_name from vehicles v join companies c on c.id = v.company_id';

function toVehicle(row) {
  return {
    id: row.id,
    plate: row.plate,
    make: row.make,
    model: row.model,
    description: row.description,
    company: { id: row.company_id, name: row.company_name },
  };
}

async function findVisibleVehicle(id, user) {
  const params = [id];
  const scope = vehicleScope(user, params);
  const { rows } = await pool.query(`${VEHICLE_SELECT} where v.id = $1 and ${scope}`, params);
  if (!rows[0]) throw new HttpError(404, 'not_found', 'Vehículo no encontrado');
  return rows[0];
}

const listQuerySchema = z.object({
  plate: z.string().trim().max(20).optional(),
  company_id: idSchema.optional(),
});

vehiclesRouter.get('/', async (req, res) => {
  const filters = validate(listQuerySchema, req.query);
  const params = [];
  const conditions = [vehicleScope(req.user, params)];

  if (filters.plate) {
    params.push(`%${escapeLike(filters.plate.toUpperCase())}%`);
    conditions.push(`v.plate like $${params.length}`);
  }
  if (filters.company_id) {
    params.push(filters.company_id);
    conditions.push(`v.company_id = $${params.length}`);
  }

  const { rows } = await pool.query(`${VEHICLE_SELECT} where ${conditions.join(' and ')} order by v.plate limit 200`, params);
  res.json({ vehicles: rows.map(toVehicle) });
});

vehiclesRouter.get('/:id', async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const vehicle = await findVisibleVehicle(id, req.user);
  const history = await listActivities(pool, req.user, { vehicle_id: id });
  res.json({ vehicle: toVehicle(vehicle), history });
});

const createSchema = z.object({
  company_id: z.number().int().positive(),
  plate: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .transform((plate) => plate.toUpperCase().replace(/\s+/g, '')),
  make: z.string().trim().max(60).default(''),
  model: z.string().trim().max(60).default(''),
  description: z.string().trim().max(500).default(''),
});

vehiclesRouter.post('/', requireRole('coordinator', 'admin'), async (req, res) => {
  const data = validate(createSchema, req.body);
  const { rows } = await pool.query(
    'insert into vehicles (company_id, plate, make, model, description) values ($1, $2, $3, $4, $5) returning id',
    [data.company_id, data.plate, data.make, data.model, data.description],
  );
  const vehicle = await findVisibleVehicle(rows[0].id, req.user);
  res.status(201).json({ vehicle: toVehicle(vehicle) });
});
