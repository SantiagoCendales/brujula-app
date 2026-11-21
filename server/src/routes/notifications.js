import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/middleware.js';
import { pool } from '../db/pool.js';
import { activityScope } from '../domain/access.js';
import { HttpError } from '../lib/errors.js';
import { idSchema, validate } from '../lib/validation.js';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get('/', async (req, res) => {
  const { before } = validate(z.object({ before: idSchema.optional() }), req.query);
  const params = [req.user.id];
  const scope = activityScope(req.user, params);
  const cursor = before ? `and n.id < $${params.push(before)}` : '';
  const { rows } = await pool.query(
    `select n.id, n.read_at, e.type, e.created_at, e.activity_id, actor.name as actor_name,
            v.plate, a.type as activity_type
     from notifications n
     join activity_events e on e.id = n.event_id
     join activities a on a.id = e.activity_id
     join vehicles v on v.id = a.vehicle_id
     join users actor on actor.id = e.user_id
     where n.user_id = $1 and ${scope} ${cursor}
     order by n.id desc limit 51`,
    params,
  );
  res.json({ notifications: rows.slice(0, 50), has_more: rows.length > 50 });
});

notificationsRouter.get('/unread-count', async (req, res) => {
  const params = [req.user.id];
  const scope = activityScope(req.user, params);
  const { rows } = await pool.query(
    `select count(*)::int as count from notifications n
     join activity_events e on e.id = n.event_id join activities a on a.id = e.activity_id
     where n.user_id = $1 and n.read_at is null and ${scope}`,
    params,
  );
  res.json({ count: rows[0].count });
});

notificationsRouter.post('/:id/read', async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const params = [id, req.user.id];
  const scope = activityScope(req.user, params);
  const { rows } = await pool.query(
    `update notifications n set read_at = coalesce(n.read_at, now())
     from activity_events e, activities a
     where n.id = $1 and n.user_id = $2 and e.id = n.event_id and a.id = e.activity_id and ${scope}
     returning n.id`,
    params,
  );
  if (!rows.length) throw new HttpError(404, 'not_found', 'Notificación no encontrada');
  res.json({ ok: true });
});
