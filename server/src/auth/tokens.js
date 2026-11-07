import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signToken(user) {
  return jwt.sign({ role: user.role, company_id: user.company_id }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}
