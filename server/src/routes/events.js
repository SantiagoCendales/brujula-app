import { Router } from 'express';
import { authenticate } from '../auth/middleware.js';
import { subscribe } from '../realtime/activityEvents.js';

export const eventsRouter = Router();

// Proxies and tunnels (ngrok, hosting load balancers) close connections that stay silent too long.
const HEARTBEAT_MS = 25_000;

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

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});
