import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { bearer, loginAs, pool, request, setup, teardown } from './helpers.js';

let app;
let ids;
const tokens = {};

before(async () => {
  ({ app, ids } = await setup());
  for (const [key, email] of Object.entries({
    coordinator: 'coordinador@brujula.test',
    technician1: 'tecnico1@brujula.test',
    technician2: 'tecnico2@brujula.test',
    clientCondor: 'cliente.condor@brujula.test',
    clientCeiba: 'cliente.ceiba@brujula.test',
  })) tokens[key] = await loginAs(app, email);
});
after(teardown);

function get(path, token) {
  return request(app).get(path).set(bearer(token));
}
function post(path, token, body = {}) {
  return request(app).post(path).set(bearer(token)).send(body);
}

test('notifications persist for recipients, isolate companies and track reads per user', async () => {
  const activityId = ids.activities[1];
  const arrival = await post(`/api/activities/${activityId}/arrive`, tokens.technician1, { lat: 1, lng: 1 });
  assert.equal(arrival.status, 200);
  const coordinator = await get('/api/notifications', tokens.coordinator);
  const client = await get('/api/notifications', tokens.clientCondor);
  assert.equal(coordinator.body.notifications.length, 1);
  assert.equal(client.body.notifications.length, 1);
  assert.equal(client.body.notifications[0].type, 'arrived');
  assert.equal((await get('/api/notifications', tokens.clientCeiba)).body.notifications.length, 0);
  assert.equal((await get('/api/notifications', tokens.technician1)).body.notifications.length, 0);
  const notificationId = client.body.notifications[0].id;
  assert.equal((await post(`/api/notifications/${notificationId}/read`, tokens.clientCeiba)).status, 404);
  assert.equal((await get('/api/notifications/unread-count', tokens.clientCondor)).body.count, 1);
  assert.equal((await post(`/api/notifications/${notificationId}/read`, tokens.clientCondor)).status, 200);
  assert.equal((await get('/api/notifications/unread-count', tokens.clientCondor)).body.count, 0);
  assert.equal((await get('/api/notifications/unread-count', tokens.coordinator)).body.count, 1);
});

test('assigned technician gets an alert, but loses access after reassignment', async () => {
  const id = ids.activities[0];
  assert.equal((await post(`/api/activities/${id}/assign`, tokens.coordinator, { technician_id: ids.users.technician1 })).status, 200);
  const first = await get('/api/notifications', tokens.technician1);
  const assigned = first.body.notifications.find((item) => item.activity_id === id);
  assert.equal(assigned.type, 'assigned');
  assert.equal((await post(`/api/activities/${id}/assign`, tokens.coordinator, { technician_id: ids.users.technician2 })).status, 200);
  assert.equal((await get('/api/notifications', tokens.technician1)).body.notifications.some((item) => item.id === assigned.id), false);
  assert.equal((await post(`/api/notifications/${assigned.id}/read`, tokens.technician1)).status, 404);
});

test('notification pagination returns all pages without duplicates', async () => {
  const { rows } = await pool.query(
    `insert into activity_events (activity_id, user_id, type)
     select $1, $2, 'arrived' from generate_series(1, 51) returning id`,
    [ids.activities[1], ids.users.technician1],
  );
  await pool.query(
    `insert into notifications (user_id, event_id)
     select $1, unnest($2::int[])`,
    [ids.users.coordinator, rows.map((row) => row.id)],
  );
  const first = await get('/api/notifications', tokens.coordinator);
  assert.equal(first.body.notifications.length, 50);
  assert.equal(first.body.has_more, true);
  const lastId = first.body.notifications.at(-1).id;
  const second = await get(`/api/notifications?before=${lastId}`, tokens.coordinator);
  assert.ok(second.body.notifications.length > 0);
  assert.ok(second.body.notifications.every((item) => item.id < lastId));
});
