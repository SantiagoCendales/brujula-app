import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/middleware.js';
import { pool } from '../db/pool.js';
import { activityScope } from '../domain/access.js';
import { listPreferences, mutableTypesFor } from '../domain/notifications.js';
import { HttpError } from '../lib/errors.js';
import { idSchema, validate } from '../lib/validation.js';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get('/preferences', async (req, res) => {
  res.json({ preferences: await listPreferences(pool, req.user) });
});

const preferenceSchema = z.object({ type: z.string(), enabled: z.boolean() }).strict();

notificationsRouter.patch('/preferences', async (req, res) => {
  const { type, enabled } = validate(preferenceSchema, req.body);
  if (!mutableTypesFor(req.user.role).includes(type)) {
    throw new HttpError(404, 'not_found', 'Tipo de notificación no configurable');
  }
  if (enabled) {
    await pool.query('delete from muted_notification_types where user_id = $1 and type = $2', [req.user.id, type]);
  } else {
    await pool.query(
      'insert into muted_notification_types (user_id, type) values ($1, $2) on conflict do nothing',
      [req.user.id, type],
    );
  }
  res.json({ ok: true });
});

function notificationScope(user, params) {
  const scope = activityScope(user, params);
  const requestScope = user.role === 'client'
    ? `exists (select 1 from vehicle_requests r where r.id = n.vehicle_request_id and r.company_id = $${params.push(user.company_id)})`
    : 'false';
  return `((n.event_id is not null and exists (
    select 1 from activity_events e join activities a on a.id = e.activity_id
    where e.id = n.event_id and ${scope}
  )) or (n.vehicle_request_id is not null and ${requestScope}))`;
}

notificationsRouter.get('/', async (req, res) => {
  const { before } = validate(z.object({ before: idSchema.optional() }), req.query);
  const params = [req.user.id];
  const scope = notificationScope(req.user, params);
  const cursor = before ? `and n.id < $${params.push(before)}` : '';
  const { rows } = await pool.query(
    `select n.id, n.read_at, coalesce(e.type, 'request_rejected') as type,
            coalesce(e.created_at, r.reviewed_at) as created_at, e.activity_id, n.vehicle_request_id,
            coalesce(actor.name, reviewer.name) as actor_name, coalesce(v.plate, r.plate) as plate,
            coalesce(a.type, r.type) as activity_type, r.review_note
     from notifications n
     left join activity_events e on e.id = n.event_id
     left join activities a on a.id = e.activity_id
     left join vehicles v on v.id = a.vehicle_id
     left join users actor on actor.id = e.user_id
     left join vehicle_requests r on r.id = n.vehicle_request_id
     left join users reviewer on reviewer.id = r.reviewed_by
     where n.user_id = $1 and ${scope} ${cursor}
     order by n.id desc limit 51`,
    params,
  );
  res.json({ notifications: rows.slice(0, 50), has_more: rows.length > 50 });
});

notificationsRouter.get('/unread-count', async (req, res) => {
  const params = [req.user.id];
  const scope = notificationScope(req.user, params);
  const { rows } = await pool.query(
    `select count(*)::int as count from notifications n
     where n.user_id = $1 and n.read_at is null and ${scope}`,
    params,
  );
  res.json({ count: rows[0].count });
});

notificationsRouter.post('/:id/read', async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const params = [id, req.user.id];
  const scope = notificationScope(req.user, params);
  const { rows } = await pool.query(
    `update notifications n set read_at = coalesce(n.read_at, now())
     where n.id = $1 and n.user_id = $2 and ${scope}
     returning n.id`,
    params,
  );
  if (!rows.length) throw new HttpError(404, 'not_found', 'Notificación no encontrada');
  res.json({ ok: true });
});
