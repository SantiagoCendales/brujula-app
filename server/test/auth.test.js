import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { bearer, loginAs, PASSWORD, pool, request, setup, teardown } from './helpers.js';

let app;

before(async () => {
  ({ app } = await setup());
});

after(teardown);

describe('POST /api/auth/login', () => {
  test('returns a token and the user without the password hash', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tecnico1@brujula.test', password: PASSWORD });

    assert.equal(response.status, 200);
    assert.ok(response.body.token);
    assert.deepEqual(Object.keys(response.body.user).sort(), ['company_id', 'email', 'id', 'name', 'role']);
    assert.equal(response.body.user.role, 'technician');
  });

  test('ignores email case and surrounding spaces', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '  Coordinador@Brujula.TEST ', password: PASSWORD });
    assert.equal(response.status, 200);
  });

  test('rejects a wrong password and an unknown email with the same error', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@brujula.test', password: 'nope' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@brujula.test', password: PASSWORD });

    for (const response of [wrongPassword, unknownEmail]) {
      assert.equal(response.status, 401);
      assert.equal(response.body.error.code, 'invalid_credentials');
    }
  });

  test('rejects invalid input with validation details', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'validation_error');
    assert.ok(response.body.error.details.length > 0);
  });
});

describe('GET /api/auth/me', () => {
  test('requires a token', async () => {
    const response = await request(app).get('/api/auth/me');
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'unauthenticated');
  });

  test('rejects a tampered token', async () => {
    const response = await request(app).get('/api/auth/me').set(bearer('abc.def.ghi'));
    assert.equal(response.status, 401);
  });

  test('returns the current user', async () => {
    const token = await loginAs(app, 'cec@brujula.test');
    const response = await request(app).get('/api/auth/me').set(bearer(token));
    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, 'cec');
  });

  test('rejects a valid token once the user is deactivated', async () => {
    const token = await loginAs(app, 'tecnico3@brujula.test');
    await pool.query(`update users set active = false where email = 'tecnico3@brujula.test'`);

    const response = await request(app).get('/api/auth/me').set(bearer(token));
    assert.equal(response.status, 401);
  });
});
