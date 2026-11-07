import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import { pool } from '../db/pool.js';
import { ROLES } from '../domain/rules.js';
import { toUser } from '../domain/users.js';
import { idSchema, validate } from '../lib/validation.js';

export const usersRouter = Router();

const listQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  company_id: idSchema.optional(),
});

usersRouter.get('/', authenticate, requireRole('admin', 'coordinator'), async (req, res) => {
  const filters = validate(listQuerySchema, req.query);
  const params = [];
  const conditions = ['true'];

  if (req.user.role === 'coordinator') {
    // Coordinators only need the active technicians, to assign activities.
    conditions.push(`role = 'technician'`, 'active');
  } else {
    if (filters.role) {
      params.push(filters.role);
      conditions.push(`role = $${params.length}`);
    }
    if (filters.company_id) {
      params.push(filters.company_id);
      conditions.push(`company_id = $${params.length}`);
    }
  }

  const { rows } = await pool.query(`select * from users where ${conditions.join(' and ')} order by name`, params);
  res.json({ users: rows.map(toUser) });
});
