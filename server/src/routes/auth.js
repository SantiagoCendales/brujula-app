import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate } from '../auth/middleware.js';
import { verifyPassword } from '../auth/password.js';
import { signToken } from '../auth/tokens.js';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { toUser } from '../domain/users.js';
import { HttpError } from '../lib/errors.js';
import { validate } from '../lib/validation.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'too_many_attempts', message: 'Demasiados intentos. Espera unos minutos.', details: null },
    });
  },
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = validate(loginSchema, req.body);
  const { rows } = await pool.query('select * from users where email = $1', [email]);
  const user = rows[0];

  const passwordMatches = await verifyPassword(password, user?.password_hash);
  if (!passwordMatches || !user.active) {
    throw new HttpError(401, 'invalid_credentials', 'Correo o contraseña incorrectos');
  }

  res.json({ token: signToken(user), user: toUser(user) });
});

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: toUser(req.user) });
});
