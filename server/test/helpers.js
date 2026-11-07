import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';

// Environment must be set before the app modules load, hence the dynamic imports below.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://brujula:brujula@localhost:5433/brujula_test';
process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough-1234567890';
process.env.UPLOADS_DIR = await mkdtemp(path.join(tmpdir(), 'brujula-test-'));

const { createApp } = await import('../src/app.js');
const { pool } = await import('../src/db/pool.js');
const { migrate } = await import('../src/db/migrate.js');
const { seed } = await import('../src/db/seed.js');

export const PASSWORD = 'test-password';

export async function setup() {
  await migrate();
  const ids = await seed({ password: PASSWORD });
  return { app: createApp(), ids };
}

export async function teardown() {
  await pool.end();
}

export async function loginAs(app, email) {
  const response = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  if (response.status !== 200) throw new Error(`Login failed for ${email}: ${response.status}`);
  return response.body.token;
}

export function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

export { pool, request };
