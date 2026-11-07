import express from 'express';
import helmet from 'helmet';
import { pool } from './db/pool.js';
import { errorHandler, HttpError } from './lib/errors.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', async (_req, res) => {
    await pool.query('select 1');
    res.json({ ok: true, database: 'connected' });
  });

  app.use('/api', () => {
    throw new HttpError(404, 'not_found', 'Ruta no encontrada');
  });

  app.use(errorHandler);
  return app;
}
