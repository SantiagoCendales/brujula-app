import { pool } from '../db/pool.js';
import { HttpError } from '../lib/errors.js';
import { verifyToken } from './tokens.js';

function unauthenticated() {
  return new HttpError(401, 'unauthenticated', 'Tu sesión venció o no es válida. Inicia sesión de nuevo.');
}

export async function authenticate(req, _res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthenticated();

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw unauthenticated();
  }

  // The token only proves identity. Role, company and active flag are re-read from the database,
  // so a deactivated user or a role change takes effect immediately.
  const { rows } = await pool.query('select id, company_id, name, email, role, active from users where id = $1', [
    Number(payload.sub),
  ]);
  const user = rows[0];
  if (!user?.active) throw unauthenticated();

  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, 'forbidden', 'No tienes permiso para esta acción');
    }

    next();
  };
}

export async function ensurePermission(user, permission) {
  const { rows } = await pool.query(
    'select enabled from role_permissions where role = $1 and permission = $2',
    [user.role, permission],
  );
  if (!rows[0]?.enabled) throw new HttpError(403, 'forbidden', 'Tu rol no tiene permiso para esta acción');
}

export function requirePermission(permission) {
  return async (req, _res, next) => {
    await ensurePermission(req.user, permission);
    next();
  };
}
