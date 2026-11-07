import { Router } from 'express';
import { authenticate } from '../auth/middleware.js';
import { pool } from '../db/pool.js';

export const companiesRouter = Router();

companiesRouter.get('/', authenticate, async (req, res) => {
  const isClient = req.user.role === 'client';
  const { rows } = await pool.query(
    `select id, name from companies ${isClient ? 'where id = $1' : ''} order by name`,
    isClient ? [req.user.company_id] : [],
  );
  res.json({ companies: rows });
});
