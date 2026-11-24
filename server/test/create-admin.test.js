import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { PASSWORD, pool, request, setup, teardown } from './helpers.js';

const { createAdmin } = await import('../src/db/createAdmin.js');

let app;

before(async () => {
  ({ app } = await setup());
});

after(teardown);

test('createAdmin creates an admin who can sign in', async () => {
  await createAdmin({ name: 'Owner', email: ' Owner@Example.Test ', password: 'a-long-password-123' });
  const login = await request(app).post('/api/auth/login').send({ email: 'owner@example.test', password: 'a-long-password-123' });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, 'admin');
});

test('createAdmin rejects short passwords and existing emails', async () => {
  await assert.rejects(createAdmin({ name: 'X', email: 'x@example.test', password: 'short' }), /at least 12/);
  const { rows } = await pool.query("select email from users where role = 'admin' limit 1");
  await assert.rejects(createAdmin({ name: 'X', email: rows[0].email, password: PASSWORD + '-long-enough' }), /already exists/);
});

test('seed refuses to run in production', async () => {
  const { config } = await import('../src/config.js');
  const { seed } = await import('../src/db/seed.js');
  config.isProduction = true;
  try {
    await assert.rejects(seed({ password: 'x', demo: false }), /never be loaded in production/);
  } finally {
    config.isProduction = false;
  }
});
