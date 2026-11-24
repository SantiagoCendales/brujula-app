import { Router } from 'express';
import { authenticate } from '../auth/middleware.js';
import { pool } from '../db/pool.js';
import { subscribe } from '../realtime/activityEvents.js';

export const eventsRouter = Router();

// Proxies and tunnels (ngrok, hosting load balancers) close connections that stay silent too long.
const HEARTBEAT_MS = 25_000;
const RECHECK_MS = 60_000;

eventsRouter.get('/', authenticate, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write(': connected\n\n');

  const unsubscribe = subscribe({
    user: req.user,
    send: (event) => res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`),
  });
  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

  // An open stream must not outlive the session: close it when the token expires or when the user is
  // deactivated or changes role or company. The app reconnects and authenticates again.
  const recheck = setInterval(async () => {
    try {
      if (Date.now() >= req.tokenExpiresAt) return res.end();
      const { rows } = await pool.query('select company_id, role, active from users where id = $1', [req.user.id]);
      const current = rows[0];
      if (!current?.active || current.role !== req.user.role || current.company_id !== req.user.company_id) res.end();
    } catch {
      // A temporary database error keeps the stream; the next check tries again.
    }
  }, RECHECK_MS);

  res.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(recheck);
    unsubscribe();
  });
});
