import path from 'node:path';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy server/.env.example to server/.env and fill it in.`);
  }
  return value;
}

function requiredSecret(name) {
  const value = required(name);
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters long.`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: required('DATABASE_URL'),
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret: requiredSecret('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  uploadsDir: path.resolve(process.env.UPLOADS_DIR ?? 'uploads'),
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};
