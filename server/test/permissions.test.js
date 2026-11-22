import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
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
    client: 'cliente.condor@brujula.test',
  })) tokens[role] = await loginAs(app, email);
});
after(async () => {
  await pool.query('update role_permissions set enabled = true');
  await teardown();
});

function patch(role, body) {
  return request(app).patch('/api/permissions').set(bearer(tokens[role])).send(body);
}
function post(role, path, body = {}) {
  return request(app).post(path).set(bearer(tokens[role])).send(body);
}

test('only authorized managers can modify existing role permissions and changes are audited', async () => {
  const body = { role: 'client', permission: 'create_activity', enabled: false };
  const coordinatorList = await request(app).get('/api/permissions').set(bearer(tokens.coordinator));
  assert.equal(coordinatorList.status, 200);
  assert.ok(coordinatorList.body.permissions.every((item) => ['client', 'technician', 'cec'].includes(item.role)));
  const adminList = await request(app).get('/api/permissions').set(bearer(tokens.admin));
  assert.ok(adminList.body.permissions.some((item) => item.role === 'admin'));
  assert.equal((await request(app).get('/api/permissions').set(bearer(tokens.client))).status, 403);
  assert.equal((await patch('client', body)).status, 403);
  assert.equal((await patch('coordinator', { role: 'admin', permission: 'deliver_report', enabled: false })).status, 403);
  assert.equal((await patch('admin', { role: 'client', permission: 'deliver_report', enabled: true })).status, 404);
  assert.equal((await patch('coordinator', body)).status, 200);
  assert.equal((await patch('coordinator', body)).status, 200);
  assert.equal((await post('client', '/api/activities', { vehicle_id: ids.vehicles.condor1, type: 'inspection' })).status, 403);
  assert.equal((await post('client', '/api/activities', { vehicle_id: ids.vehicles.ceiba1, type: 'inspection' })).status, 404);
  const audit = await pool.query('select changed_by, enabled from permission_changes where role = $1 and permission = $2', ['client', 'create_activity']);
  assert.equal(audit.rows.length, 1);
  assert.equal(audit.rows[0].changed_by, ids.users.coordinator);
  assert.equal(audit.rows[0].enabled, false);
  assert.equal((await patch('coordinator', { ...body, enabled: true })).status, 200);
  assert.equal((await post('client', '/api/activities', { vehicle_id: ids.vehicles.condor1, type: 'inspection' })).status, 201);
  assert.equal((await post('client', '/api/activities', { vehicle_id: ids.vehicles.ceiba1, type: 'inspection' })).status, 404);
});

test('revoking assignment also blocks assigning when creating an activity', async () => {
  const change = { role: 'coordinator', permission: 'assign_technician', enabled: false };
  assert.equal((await patch('admin', change)).status, 200);
  assert.equal((await post('coordinator', '/api/activities', {
    vehicle_id: ids.vehicles.condor1, type: 'inspection', technician_id: ids.users.technician1,
  })).status, 403);
  assert.equal((await post('coordinator', `/api/activities/${ids.activities[0]}/assign`, { technician_id: ids.users.technician1 })).status, 403);
  assert.equal((await patch('admin', { ...change, enabled: true })).status, 200);
});

test('technical and review permissions do not bypass visibility or role checks', async () => {
  const work = { role: 'technician', permission: 'record_field_work', enabled: false };
  assert.equal((await patch('coordinator', work)).status, 200);
  assert.equal((await post('technician', `/api/activities/${ids.activities[1]}/arrive`, { lat: 1, lng: 1 })).status, 403);
  assert.equal((await post('technician', `/api/activities/${ids.activities[2]}/arrive`, { lat: 1, lng: 1 })).status, 404);
  assert.equal((await patch('coordinator', { ...work, enabled: true })).status, 200);
  const review = { role: 'cec', permission: 'review_report', enabled: false };
  assert.equal((await patch('coordinator', review)).status, 200);
  assert.equal((await post('cec', `/api/activities/${ids.activities[1]}/validate`)).status, 403);
  assert.equal((await post('client', `/api/activities/${ids.activities[1]}/validate`)).status, 403);
  assert.equal((await patch('coordinator', { ...review, enabled: true })).status, 200);
});

test('remaining permissions block only their configured actions', async () => {
  const createVehicle = { role: 'coordinator', permission: 'create_vehicle', enabled: false };
  assert.equal((await patch('admin', createVehicle)).status, 200);
  assert.equal((await post('coordinator', '/api/vehicles', { company_id: ids.companies.condor, plate: 'DEMO-909' })).status, 403);
  assert.equal((await patch('admin', { ...createVehicle, enabled: true })).status, 200);

  const finish = { role: 'technician', permission: 'finish_report', enabled: false };
  assert.equal((await patch('coordinator', finish)).status, 200);
  assert.equal((await post('technician', `/api/activities/${ids.activities[1]}/finish`, { lat: 1, lng: 1 })).status, 403);
  assert.equal((await patch('coordinator', { ...finish, enabled: true })).status, 200);

  const deliver = { role: 'coordinator', permission: 'deliver_report', enabled: false };
  assert.equal((await patch('admin', deliver)).status, 200);
  assert.equal((await post('coordinator', `/api/activities/${ids.activities[1]}/deliver`)).status, 403);
  assert.equal((await patch('admin', { ...deliver, enabled: true })).status, 200);
});
