import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { subscribe } from '../src/realtime/activityEvents.js';
import { bearer, loginAs, pool, request, setup, teardown } from './helpers.js';

let app;
let ids;
const tokens = {};

before(async () => {
  ({ app, ids } = await setup());
  for (const [role, email] of Object.entries({
    admin: 'admin@brujula.test',
    coordinator: 'coordinador@brujula.test',
    cec: 'cec@brujula.test',
    technician: 'tecnico1@brujula.test',
    otherTechnician: 'tecnico3@brujula.test',
    client: 'cliente.condor@brujula.test',
    otherClient: 'cliente.ceiba@brujula.test',
  })) tokens[role] = await loginAs(app, email);
});

after(teardown);

function get(role, path) {
  return request(app).get(path).set(bearer(tokens[role]));
}

function post(role, path, body) {
  return request(app).post(path).set(bearer(tokens[role])).send(body);
}

function patch(role, path, body) {
  return request(app).patch(path).set(bearer(tokens[role])).send(body);
}

test('all roles with access can comment at every state, including after delivery', async () => {
  const id = ids.activities[1];
  const path = `/api/activities/${id}/comments`;
  const roles = ['client', 'technician', 'cec', 'coordinator', 'admin'];
  const statuses = ['requested', 'assigned', 'on_site', 'report_ready', 'validated', 'returned', 'delivered'];
  for (const status of statuses) {
    await pool.query('update activities set status = $2 where id = $1', [id, status]);
    for (const role of roles) {
      const response = await post(role, path, {
        body: ` ${role} ${status} `, ...(role === 'client' ? {} : { visibility: 'public' }),
      });
      assert.equal(response.status, 201);
      assert.equal(response.body.comment.body, `${role} ${status}`);
      assert.equal(response.body.comment.edited_at, null);
      assert.ok(response.body.comment.created_at);
    }
    const activity = await get('client', `/api/activities/${id}`);
    assert.equal(activity.body.activity.status, status === 'returned' ? 'report_ready' : status);
  }
  const response = await get('client', path);
  assert.equal(response.status, 200);
  assert.equal(response.body.comments.length, roles.length * statuses.length);
  assert.equal(response.body.comments[0].author.id, ids.users.clientCondor);
});

test('only the author can edit, with an edit timestamp and no delete endpoint', async () => {
  const path = `/api/activities/${ids.activities[1]}/comments`;
  const created = await post('client', path, { body: 'Primera novedad' });
  const commentPath = `${path}/${created.body.comment.id}`;
  assert.equal((await patch('coordinator', commentPath, { body: 'Texto ajeno' })).status, 403);
  const edited = await patch('client', commentPath, { body: 'Novedad actualizada' });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.comment.body, 'Novedad actualizada');
  assert.equal(edited.body.comment.created_at, created.body.comment.created_at);
  assert.ok(edited.body.comment.edited_at);
  assert.equal((await request(app).delete(commentPath).set(bearer(tokens.client))).status, 404);
  const listed = await get('coordinator', path);
  assert.equal(listed.body.comments.find((item) => item.id === created.body.comment.id).body, 'Novedad actualizada');
});

test('other companies and unassigned technicians cannot read or write comments', async () => {
  const path = `/api/activities/${ids.activities[1]}/comments`;
  const created = await post('client', path, { body: 'Mensaje visible' });
  for (const role of ['otherClient', 'otherTechnician']) {
    assert.equal((await get(role, path)).status, 404);
    assert.equal((await post(role, path, { body: 'No permitido', visibility: 'public' })).status, 404);
    assert.equal((await patch(role, `${path}/${created.body.comment.id}`, { body: 'No permitido' })).status, 404);
  }
  assert.equal((await patch('client', `${path}/999999`, { body: 'No existe' })).status, 404);
  const otherActivity = `/api/activities/${ids.activities[0]}/comments/${created.body.comment.id}`;
  assert.equal((await patch('client', otherActivity, { body: 'Otra actividad' })).status, 404);
});

test('comments reject empty, oversized and unexpected input', async () => {
  const path = `/api/activities/${ids.activities[1]}/comments`;
  for (const input of [{ body: '  ' }, { body: 'x'.repeat(2001) }, { body: 'Bien', extra: true }]) {
    assert.equal((await post('client', path, input)).status, 400);
  }
});

test('comments on vehicle history notify currently assigned technicians but not unrelated users', async () => {
  const { rows } = await pool.query(
    `insert into activities (company_id, vehicle_id, type, status, created_by, performed_by)
     values ($1, $2, 'inspection', 'delivered', $3, $4) returning id`,
    [ids.companies.condor, ids.vehicles.condor2, ids.users.coordinator, ids.users.technician3],
  );
  const path = `/api/activities/${rows[0].id}/comments`;
  const received = { assigned: [], performed: [], otherClient: [] };
  const unsubscribers = [
    subscribe({ user: { id: ids.users.technician1, role: 'technician' }, send: (event) => received.assigned.push(event) }),
    subscribe({ user: { id: ids.users.technician3, role: 'technician' }, send: (event) => received.performed.push(event) }),
    subscribe({ user: { id: ids.users.clientCeiba, role: 'client', company_id: ids.companies.ceiba }, send: (event) => received.otherClient.push(event) }),
  ];
  try {
    assert.equal((await get('technician', path)).status, 200);
    assert.equal((await get('otherTechnician', path)).status, 200);
    const created = await post('technician', path, { body: 'Seguimiento del vehículo', visibility: 'public' });
    assert.equal(created.status, 201);
    assert.equal((await patch('technician', `${path}/${created.body.comment.id}`, { body: 'Seguimiento actualizado' })).status, 200);
    assert.equal((await post('otherTechnician', path, { body: 'Seguimiento del técnico que ejecutó', visibility: 'public' })).status, 201);
    assert.deepEqual(received.assigned.map((event) => event.change), ['comment_added', 'comment_updated', 'comment_added']);
    assert.deepEqual(received.performed.map((event) => event.change), ['comment_added', 'comment_updated', 'comment_added']);
    assert.deepEqual(received.otherClient, []);
  } finally {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  }
});

test('internal comments are hidden from clients and only the author can change visibility', async () => {
  const path = `/api/activities/${ids.activities[1]}/comments`;
  assert.equal((await post('coordinator', path, { body: 'Sin elegir visibilidad' })).status, 400);
  assert.equal((await post('client', path, { body: 'Privado', visibility: 'internal' })).status, 403);
  const created = await post('coordinator', path, { body: 'Nota interna', visibility: 'internal' });
  assert.equal(created.status, 201);
  assert.equal(created.body.comment.visibility, 'internal');
  const commentPath = `${path}/${created.body.comment.id}`;
  let visible = await get('client', path);
  assert.ok(!visible.body.comments.some((comment) => comment.id === created.body.comment.id));
  assert.equal((await patch('client', commentPath, { body: 'No autorizado' })).status, 404);
  assert.equal((await patch('admin', commentPath, { body: 'No autorizado', visibility: 'public' })).status, 403);
  assert.ok((await get('technician', path)).body.comments.some((comment) => comment.id === created.body.comment.id));

  const published = await patch('coordinator', commentPath, { body: 'Nota interna', visibility: 'public' });
  assert.equal(published.status, 200);
  assert.equal(published.body.comment.visibility, 'public');
  assert.ok(published.body.comment.edited_at);
  visible = await get('client', path);
  assert.ok(visible.body.comments.some((comment) => comment.id === created.body.comment.id));

  assert.equal((await patch('coordinator', commentPath, { body: 'Nota interna', visibility: 'internal' })).status, 200);
  visible = await get('client', path);
  assert.ok(!visible.body.comments.some((comment) => comment.id === created.body.comment.id));
  const clientComment = await post('client', path, { body: 'Comentario del cliente' });
  assert.equal(clientComment.body.comment.visibility, 'public');
  assert.equal((await patch('client', `${path}/${clientComment.body.comment.id}`, {
    body: 'Intento de ocultar', visibility: 'internal',
  })).status, 403);
});

test('live events hide internal changes from clients but refresh when visibility changes', async () => {
  const path = `/api/activities/${ids.activities[1]}/comments`;
  const received = { client: [], coordinator: [], otherClient: [] };
  const unsubscribers = [
    subscribe({ user: { id: ids.users.clientCondor, role: 'client', company_id: ids.companies.condor }, send: (event) => received.client.push(event) }),
    subscribe({ user: { id: ids.users.coordinator, role: 'coordinator' }, send: (event) => received.coordinator.push(event) }),
    subscribe({ user: { id: ids.users.clientCeiba, role: 'client', company_id: ids.companies.ceiba }, send: (event) => received.otherClient.push(event) }),
  ];
  try {
    const created = await post('coordinator', path, { body: 'Interno', visibility: 'internal' });
    const commentPath = `${path}/${created.body.comment.id}`;
    assert.equal((await patch('coordinator', commentPath, { body: 'Aún interno', visibility: 'internal' })).status, 200);
    assert.deepEqual(received.client, []);
    assert.equal((await patch('coordinator', commentPath, { body: 'Ahora público', visibility: 'public' })).status, 200);
    assert.equal((await patch('coordinator', commentPath, { body: 'Otra vez interno', visibility: 'internal' })).status, 200);
    assert.equal((await patch('coordinator', commentPath, { body: 'Sigue interno', visibility: 'internal' })).status, 200);
    assert.deepEqual(received.client.map((event) => event.change), ['comment_updated', 'comment_updated']);
    assert.equal(received.coordinator.length, 5);
    assert.deepEqual(received.otherClient, []);
  } finally {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  }
});
