import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { request, setup, teardown } from './helpers.js';

let app;

before(async () => {
  ({ app } = await setup());
});

after(teardown);

function preflight(origin) {
  return request(app)
    .options('/api/activities')
    .set('Origin', origin)
    .set('Access-Control-Request-Method', 'GET')
    .set('Access-Control-Request-Headers', 'authorization');
}

test('the Android app origin may call the API', async () => {
  const response = await preflight('https://localhost');
  assert.equal(response.status, 204);
  assert.equal(response.headers['access-control-allow-origin'], 'https://localhost');
});

test('other origins get no CORS permission', async () => {
  const response = await preflight('https://evil.example.com');
  assert.equal(response.headers['access-control-allow-origin'], undefined);
});
