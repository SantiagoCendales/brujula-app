import express from 'express';
import helmet from 'helmet';
import { pool } from './db/pool.js';
import { errorHandler, HttpError } from './lib/errors.js';
import { authRouter } from './routes/auth.js';
import { catalogsRouter } from './routes/catalogs.js';
import { companiesRouter } from './routes/companies.js';
import { usersRouter } from './routes/users.js';
import { vehiclesRouter } from './routes/vehicles.js';

export function createApp() {
  const app = express();

  // Requests arrive through one proxy (Vite in development, ngrok or the hosting platform otherwise);
  // this makes req.ip the real client IP, which the login rate limit relies on.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', async (_req, res) => {
    await pool.query('select 1');
    res.json({ ok: true, database: 'connected' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/catalogs', catalogsRouter);
  app.use('/api/companies', companiesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/vehicles', vehiclesRouter);

  app.use('/api', () => {
    throw new HttpError(404, 'not_found', 'Ruta no encontrada');
  });

  app.use(errorHandler);
  return app;
}
