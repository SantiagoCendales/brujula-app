import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import { pool, withTransaction } from '../db/pool.js';
import { HttpError } from '../lib/errors.js';
import { validate } from '../lib/validation.js';

export const permissionsRouter = Router();
permissionsRouter.use(authenticate);

permissionsRouter.get('/me', async (req, res) => {
  const { rows } = await pool.query(
    'select permission from role_permissions where role = $1 and enabled order by permission',
    [req.user.role],
  );
  res.json({ permissions: rows.map((row) => row.permission) });
});

permissionsRouter.get('/', requireRole('admin', 'coordinator'), async (req, res) => {
  const { rows } = await pool.query(
    `select role, permission, enabled from role_permissions
     where $1 = 'admin' or role in ('client', 'technician', 'cec')
     order by role, permission`,
    [req.user.role],
  );
  res.json({ permissions: rows });
});

const updateSchema = z.object({
  role: z.enum(['admin', 'coordinator', 'cec', 'technician', 'client']),
  permission: z.enum([
    'create_activity', 'create_vehicle', 'assign_technician', 'record_field_work',
    'finish_report', 'review_report', 'deliver_report',
  ]),
  enabled: z.boolean(),
}).strict();

permissionsRouter.patch('/', requireRole('admin', 'coordinator'), async (req, res) => {
  const data = validate(updateSchema, req.body);
  if (req.user.role === 'coordinator' && ['admin', 'coordinator'].includes(data.role)) {
    throw new HttpError(403, 'forbidden', 'Solo un administrador puede modificar esos roles');
  }
  await withTransaction(async (db) => {
    const { rows } = await db.query(
      'select enabled from role_permissions where role = $1 and permission = $2 for update',
      [data.role, data.permission],
    );
    if (!rows.length) throw new HttpError(404, 'not_found', 'Permiso no configurable para este rol');
    if (rows[0].enabled === data.enabled) return;
    await db.query('update role_permissions set enabled = $3 where role = $1 and permission = $2', [
      data.role, data.permission, data.enabled,
    ]);
    await db.query(
      'insert into permission_changes (role, permission, enabled, changed_by) values ($1, $2, $3, $4)',
      [data.role, data.permission, data.enabled, req.user.id],
    );
  });
  res.json({ ok: true });
});
