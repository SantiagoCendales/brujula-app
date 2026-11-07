import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { bearer, loginAs, request, setup, teardown } from './helpers.js';

let app;
let ids;
let server;
let baseUrl;
const tokens = {};
const streams = [];

before(async () => {
  ({ app, ids } = await setup());
  for (const [key, email] of Object.entries({
    coordinator: 'coordinador@brujula.test',
    technician1: 'tecnico1@brujula.test',
    technician2: 'tecnico2@brujula.test',
    clientCondor: 'cliente.condor@brujula.test',
    clientCeiba: 'cliente.ceiba@brujula.test',
  })) {
    tokens[key] = await loginAs(app, email);
  }
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  for (const stream of streams) stream.close();
  await new Promise((resolve) => server.close(resolve));
  await teardown();
});

// Opens the live stream like the app does and collects the activity events it receives.
async function openStream(token) {
  const controller = new AbortController();
  const response = await fetch(`${baseUrl}/api/events`, { headers: bearer(token), signal: controller.signal });
  const events = [];
  const stream = { status: response.status, events, close: () => controller.abort() };
  streams.push(stream);
  if (!response.ok) return stream;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop();
        for (const message of messages) {
          const data = message.split('\n').find((line) => line.startsWith('data: '));
          if (data) events.push(JSON.parse(data.slice(6)));
        }
      }
    } catch {
      // aborted when the test closes the stream
    }
  })();
  return stream;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 200));

test('a change reaches only the users allowed to see the activity', async () => {
  const coordinator = await openStream(tokens.coordinator);
  const clientCondor = await openStream(tokens.clientCondor);
  const clientCeiba = await openStream(tokens.clientCeiba);
  const technician2 = await openStream(tokens.technician2);
  await settle();

  const condorActivityId = ids.activities[1]; // condor vehicle, assigned to technician1
  const arrived = await request(app)
    .post(`/api/activities/${condorActivityId}/arrive`)
    .set(bearer(tokens.technician1))
    .send({ lat: 9.93, lng: -84.08 });
  assert.equal(arrived.status, 200);
  await settle();

  const expected = {
    type: 'activity.changed',
    activity_id: condorActivityId,
    status: 'on_site',
    technician_id: ids.users.technician1,
  };
  assert.deepEqual(coordinator.events, [expected]);
  assert.deepEqual(clientCondor.events, [expected]);
  assert.deepEqual(clientCeiba.events, [], 'a client never hears about another company');
  assert.deepEqual(technician2.events, [], 'a technician only hears about their own work');
});

test('a reassigned technician is told so their list refreshes', async () => {
  const technician2 = await openStream(tokens.technician2);
  await settle();

  const ceibaActivityId = ids.activities[2]; // assigned to technician2
  await request(app)
    .post(`/api/activities/${ceibaActivityId}/assign`)
    .set(bearer(tokens.coordinator))
    .send({ technician_id: ids.users.technician3 });
  await settle();

  assert.deepEqual(
    technician2.events.map((event) => event.activity_id),
    [ceibaActivityId],
  );
});

test('a technician hears about a new activity assigned to them as soon as it is created', async () => {
  const technician1 = await openStream(tokens.technician1);
  await settle();

  const created = await request(app)
    .post('/api/activities')
    .set(bearer(tokens.coordinator))
    .send({ vehicle_id: ids.vehicles.condor1, type: 'gps_install', technician_id: ids.users.technician1 });
  await settle();

  assert.deepEqual(technician1.events, [
    { type: 'activity.changed', activity_id: created.body.activity.id, status: 'assigned', technician_id: ids.users.technician1 },
  ]);
});

test('the stream requires a valid session', async () => {
  const anonymous = await openStream('not-a-token');
  assert.equal(anonymous.status, 401);
});
