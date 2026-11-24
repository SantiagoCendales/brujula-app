import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { bearer, loginAs, pool, request, setup, teardown } from './helpers.js';

let app;
let ids;
const tokens = {};

before(async () => {
  ({ app, ids } = await setup());
  for (const [key, email] of Object.entries({
    admin: 'admin@brujula.test',
    coordinator: 'coordinador@brujula.test',
    technician: 'tecnico1@brujula.test',
    cec: 'cec@brujula.test',
    clientCondor: 'cliente.condor@brujula.test',
    clientCeiba: 'cliente.ceiba@brujula.test',
  })) tokens[key] = await loginAs(app, email);
});
after(teardown);

const get = (path, token) => request(app).get(path).set(bearer(token));
const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01]);
const post = (path, token, body = {}) => {
  const operation = request(app).post(path).set(bearer(token));
  return path === '/api/vehicle-requests'
    ? operation.field('data', JSON.stringify(body)).attach('ownership_photo', photo, 'photo.jpg')
    : operation.send(body);
};

const newRequest = (overrides = {}) => ({
  plate: ' nue 123 ',
  make: 'Renault',
  model: 'Master',
  vin: '9BWZZZ377VT004251',
  year: 2024,
  color: 'Blanco',
  type: 'gps_install',
  description: 'Instalar GPS',
  location: 'Patio principal, Bogotá',
  city: 'Bogotá',
  department: 'Cundinamarca',
  scheduled_for: '2030-01-15T14:00:00-05:00',
  ...overrides,
});

test('a client requests a new plate, and only its own company and staff can see it', async () => {
  const created = await post('/api/vehicle-requests', tokens.clientCondor, newRequest());
  assert.equal(created.status, 201);
  assert.equal(created.body.request.plate, 'NUE123');
  assert.equal(created.body.request.status, 'pending');
  assert.equal(created.body.request.vin, '9BWZZZ377VT004251');
  assert.equal(created.body.request.location, 'Patio principal, Bogotá');
  assert.equal(created.body.request.city, 'Bogotá');
  assert.equal(created.body.request.department, 'Cundinamarca');
  assert.equal(created.body.request.has_ownership_photo, true);
  const imagePath = `/api/vehicle-requests/${created.body.request.id}/ownership-photo`;
  assert.equal((await get(imagePath, tokens.clientCondor)).status, 200);
  assert.equal((await get(imagePath, tokens.coordinator)).status, 200);
  assert.equal((await get(imagePath, tokens.clientCeiba)).status, 404);
  assert.equal((await get(imagePath, tokens.technician)).status, 404);
  assert.equal((await get(imagePath, tokens.cec)).status, 404);
  assert.equal((await get(`/api/vehicle-requests/${created.body.request.id}`, tokens.clientCondor)).status, 200);
  assert.equal((await get(`/api/vehicle-requests/${created.body.request.id}`, tokens.coordinator)).status, 200);
  assert.equal((await get(`/api/vehicle-requests/${created.body.request.id}`, tokens.clientCeiba)).status, 404);
  assert.equal((await get(`/api/vehicle-requests/${created.body.request.id}`, tokens.technician)).status, 404);

  assert.equal((await get('/api/vehicle-requests', tokens.clientCondor)).body.requests.length, 1);
  assert.equal((await get('/api/vehicle-requests', tokens.clientCeiba)).body.requests.length, 0);
  assert.equal((await get('/api/vehicle-requests?status=pending', tokens.coordinator)).body.requests.length, 1);
  assert.equal((await get('/api/vehicle-requests', tokens.technician)).status, 403);
  assert.equal((await get('/api/vehicle-requests', tokens.cec)).status, 403);

  // The vehicle does not exist until staff approve.
  assert.equal((await get('/api/vehicles?plate=NUE123', tokens.coordinator)).body.vehicles.length, 0);
});

test('invalid requests, existing fleet plates and duplicates are rejected without leaking other companies', async () => {
  assert.equal((await post('/api/vehicle-requests', tokens.coordinator, newRequest())).status, 403);
  assert.equal((await post('/api/vehicle-requests', tokens.clientCondor, newRequest({ plate: 'X1', location: '' }))).status, 400);
  assert.equal((await post('/api/vehicle-requests', tokens.clientCondor, newRequest({ plate: 'X1', scheduled_for: null }))).status, 400);
  const missingCity = await post('/api/vehicle-requests', tokens.clientCondor, newRequest({ plate: 'X1', city: '' }));
  assert.equal(missingCity.status, 400);
  assert.match(missingCity.body.error.message, /Ciudad/);
  const invalid = await post('/api/vehicle-requests', tokens.clientCondor, newRequest({ plate: 'X1', year: 'no' }));
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.error.message, /Año/);
  const missingPhoto = await request(app).post('/api/vehicle-requests').set(bearer(tokens.clientCondor))
    .field('data', JSON.stringify(newRequest({ plate: 'X2' })));
  assert.equal(missingPhoto.status, 400);
  assert.match(missingPhoto.body.error.message, /foto de la tarjeta/);
  const invalidPhoto = await request(app).post('/api/vehicle-requests').set(bearer(tokens.clientCondor))
    .field('data', JSON.stringify(newRequest({ plate: 'X2' }))).attach('ownership_photo', Buffer.from('not an image'), 'photo.jpg');
  assert.equal(invalidPhoto.status, 400);
  assert.match(invalidPhoto.body.error.message, /JPEG, PNG o WebP/);

  assert.equal((await post('/api/vehicle-requests', tokens.clientCondor, newRequest({ plate: 'demo-101' }))).body.error.code, 'plate_exists');
  assert.equal((await post('/api/vehicle-requests', tokens.clientCondor, newRequest())).body.error.code, 'request_pending');
  // Another company's plate is accepted as a request: the client must not learn it exists elsewhere.
  assert.equal((await post('/api/vehicle-requests', tokens.clientCondor, newRequest({ plate: 'DEMO-201' }))).status, 201);
});

test('approving creates the vehicle and the service activity, notifies the client and is final', async () => {
  const { requests } = (await get('/api/vehicle-requests?status=pending', tokens.coordinator)).body;
  const request = requests.find((item) => item.plate === 'NUE123');

  assert.equal((await post(`/api/vehicle-requests/${request.id}/approve`, tokens.clientCondor)).status, 403);
  const invalid = await post(`/api/vehicle-requests/${request.id}/approve`, tokens.coordinator, { department: '' });
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.error.message, /Departamento/);
  const invalidDate = await post(`/api/vehicle-requests/${request.id}/approve`, tokens.coordinator, { scheduled_for: 'mañana' });
  assert.equal(invalidDate.status, 400);
  assert.match(invalidDate.body.error.message, /Fecha y hora/);
  const adjusted = {
    city: 'Cali', department: 'Valle del Cauca', location: 'Carrera 1 # 2-3',
    scheduled_for: '2030-01-16T15:15:00-05:00',
  };
  const approved = await post(`/api/vehicle-requests/${request.id}/approve`, tokens.coordinator, adjusted);
  assert.equal(approved.status, 200);
  assert.equal(approved.body.request.status, 'approved');
  assert.equal(approved.body.request.reviewed_by.name, 'Carlos Coordinador');
  assert.equal(approved.body.request.city, 'Bogotá');
  assert.equal(approved.body.request.location, 'Patio principal, Bogotá');

  const vehicles = (await get('/api/vehicles?plate=NUE123', tokens.clientCondor)).body.vehicles;
  assert.equal(vehicles.length, 1);
  assert.equal(vehicles[0].vin, '9BWZZZ377VT004251');
  assert.equal(vehicles[0].year, 2024);
  assert.equal(vehicles[0].color, 'Blanco');
  assert.equal((await get('/api/vehicles?plate=NUE123', tokens.clientCeiba)).body.vehicles.length, 0);

  const activity = (await get(`/api/activities/${approved.body.request.activity_id}`, tokens.clientCondor)).body.activity;
  assert.equal(activity.status, 'requested');
  assert.equal(activity.location, adjusted.location);
  assert.equal(activity.city, adjusted.city);
  assert.equal(activity.department, adjusted.department);
  assert.equal(activity.type, 'gps_install');
  assert.equal(activity.scheduled_for, new Date(adjusted.scheduled_for).toISOString());
  assert.equal((await get(`/api/activities/${activity.id}`, tokens.clientCeiba)).status, 404);

  const staffView = (await get(`/api/activities/${activity.id}`, tokens.coordinator)).body.activity;
  assert.deepEqual(staffView.events.map((event) => event.type), ['created', 'request_approved']);
  const review = staffView.events.find((event) => event.type === 'request_approved').data;
  assert.equal(review.requested.city, 'Bogotá');
  assert.equal(review.requested.scheduled_for, new Date(newRequest().scheduled_for).toISOString());
  assert.equal(review.approved.city, adjusted.city);
  assert.equal(new Date(review.approved.scheduled_for).toISOString(), new Date(adjusted.scheduled_for).toISOString());

  const notifications = (await get('/api/notifications', tokens.clientCondor)).body.notifications;
  assert.ok(notifications.some((item) => item.type === 'request_approved' && item.activity_id === activity.id));
  assert.equal((await get('/api/notifications', tokens.coordinator)).body.notifications.some((item) => item.type === 'request_approved'), false);

  assert.equal((await post(`/api/vehicle-requests/${request.id}/approve`, tokens.coordinator)).status, 409);
  assert.equal((await post(`/api/vehicle-requests/${request.id}/reject`, tokens.coordinator, { note: 'Ya no aplica' })).status, 409);
});

test('approval without changes preserves the requested schedule and supports older requests', async () => {
  const modern = await post('/api/vehicle-requests', tokens.clientCondor, newRequest({ plate: 'SIN123' }));
  const unchanged = await post(`/api/vehicle-requests/${modern.body.request.id}/approve`, tokens.coordinator);
  assert.equal(unchanged.status, 200);
  const modernActivity = (await get(`/api/activities/${unchanged.body.request.activity_id}`, tokens.clientCondor)).body.activity;
  assert.equal(modernActivity.city, newRequest().city);
  assert.equal(modernActivity.department, newRequest().department);
  assert.equal(modernActivity.scheduled_for, new Date(newRequest().scheduled_for).toISOString());

  const created = await post('/api/vehicle-requests', tokens.clientCondor, newRequest({ plate: 'LEG123' }));
  const id = created.body.request.id;
  await pool.query('update vehicle_requests set city = null, department = null where id = $1', [id]);
  const approved = await post(`/api/vehicle-requests/${id}/approve`, tokens.admin);
  assert.equal(approved.status, 200);
  const activity = (await get(`/api/activities/${approved.body.request.activity_id}`, tokens.clientCondor)).body.activity;
  assert.equal(activity.city, null);
  assert.equal(activity.department, null);
  assert.equal(activity.location, newRequest().location);
  assert.equal(activity.scheduled_for, new Date(newRequest().scheduled_for).toISOString());
});

test('approval fails for a plate registered elsewhere; rejection needs a note and keeps the reason', async () => {
  const { requests } = (await get('/api/vehicle-requests?status=pending', tokens.admin)).body;
  const clash = requests.find((item) => item.plate === 'DEMO-201');

  const approval = await post(`/api/vehicle-requests/${clash.id}/approve`, tokens.admin);
  assert.equal(approval.status, 409);
  assert.equal(approval.body.error.code, 'plate_exists');
  assert.equal((await get('/api/vehicle-requests?status=pending', tokens.admin)).body.requests.length, 1);

  assert.equal((await post(`/api/vehicle-requests/${clash.id}/reject`, tokens.admin, {})).status, 400);
  assert.equal((await post(`/api/vehicle-requests/${clash.id}/reject`, tokens.clientCondor, { note: 'No' })).status, 403);
  await pool.query(
    `insert into users (company_id, name, email, password_hash, role)
     select company_id, 'Cliente ficticio', 'cliente.otro@brujula.test', password_hash, role
     from users where id = $1`,
    [ids.users.clientCondor],
  );
  const secondClient = await loginAs(app, 'cliente.otro@brujula.test');
  const muted = await request(app).patch('/api/notifications/preferences').set(bearer(tokens.clientCondor))
    .send({ type: 'request_rejected', enabled: false });
  assert.equal(muted.status, 200);
  const previousCount = (await get('/api/notifications/unread-count', tokens.clientCondor)).body.count;
  const rejected = await post(`/api/vehicle-requests/${clash.id}/reject`, tokens.admin, { note: 'La placa no corresponde a tu flota' });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.request.status, 'rejected');

  const own = (await get('/api/vehicle-requests?status=rejected', tokens.clientCondor)).body.requests;
  assert.equal(own[0].review_note, 'La placa no corresponde a tu flota');
  const notifications = (await get('/api/notifications', tokens.clientCondor)).body.notifications;
  const notice = notifications.find((item) => item.vehicle_request_id === clash.id);
  assert.equal(notice.type, 'request_rejected');
  assert.equal(notice.plate, 'DEMO-201');
  assert.equal(notice.review_note, 'La placa no corresponde a tu flota');
  assert.equal(notice.activity_id, null);
  assert.equal(notice.read_at, null);
  assert.equal((await get('/api/notifications/unread-count', tokens.clientCondor)).body.count, previousCount + 1);
  const secondNotice = (await get('/api/notifications', secondClient)).body.notifications.find((item) => item.vehicle_request_id === clash.id);
  assert.ok(secondNotice);
  assert.equal((await get('/api/notifications', tokens.clientCeiba)).body.notifications.some((item) => item.vehicle_request_id === clash.id), false);
  assert.equal((await post(`/api/notifications/${notice.id}/read`, tokens.clientCeiba)).status, 404);
  assert.equal((await post(`/api/notifications/${notice.id}/read`, secondClient)).status, 404);
  assert.equal((await post(`/api/notifications/${notice.id}/read`, tokens.clientCondor)).status, 200);
  assert.equal((await get('/api/notifications/unread-count', tokens.clientCondor)).body.count, previousCount);
  assert.equal((await get('/api/notifications/unread-count', secondClient)).body.count, 1);
  assert.ok((await get('/api/notifications', tokens.clientCondor)).body.notifications.find((item) => item.id === notice.id).read_at);
  assert.equal((await post(`/api/vehicle-requests/${clash.id}/reject`, tokens.admin, { note: 'Otra vez' })).status, 409);
  assert.equal((await get('/api/notifications', secondClient)).body.notifications.filter((item) => item.vehicle_request_id === clash.id).length, 1);
  assert.equal((await post('/api/vehicle-requests/999999/approve', tokens.admin)).status, 404);
  assert.equal((await post('/api/vehicle-requests', tokens.clientCondor, newRequest({ plate: 'DEMO-201' }))).status, 201);
});

test('turning off create_vehicle blocks reviewing requests', async () => {
  await pool.query("update role_permissions set enabled = false where role = 'coordinator' and permission = 'create_vehicle'");
  try {
    const { requests } = (await get('/api/vehicle-requests?status=pending', tokens.coordinator)).body;
    assert.equal((await post(`/api/vehicle-requests/${requests[0].id}/reject`, tokens.coordinator, { note: 'Prueba' })).status, 403);
    assert.equal((await post(`/api/vehicle-requests/${requests[0].id}/approve`, tokens.coordinator)).status, 403);
  } finally {
    await pool.query("update role_permissions set enabled = true where role = 'coordinator' and permission = 'create_vehicle'");
  }
});

test('a rejected request can be corrected once, with its history preserved and visible to staff', async () => {
  const initial = await post('/api/vehicle-requests', tokens.clientCondor, newRequest({ plate: 'EDT001', model: 'Antes' }));
  const sourceId = initial.body.request.id;
  assert.equal((await post('/api/vehicle-requests', tokens.clientCondor, newRequest({
    plate: 'EDT002', resubmitted_from_id: sourceId,
  }))).body.error.code, 'invalid_status');
  assert.equal((await post(`/api/vehicle-requests/${sourceId}/reject`, tokens.admin, { note: 'Corrige la placa y el modelo' })).status, 200);
  assert.equal((await post('/api/vehicle-requests', tokens.clientCeiba, newRequest({
    plate: 'EDT002', resubmitted_from_id: sourceId,
  }))).status, 404);

  const attempts = await Promise.all(['EDT002', 'EDT003'].map((plate) =>
    post('/api/vehicle-requests', tokens.clientCondor, newRequest({ plate, model: 'Corregido', resubmitted_from_id: sourceId }))));
  const sent = attempts.find((response) => response.status === 201);
  const duplicate = attempts.find((response) => response.status === 409);
  assert.ok(sent);
  assert.equal(duplicate.body.error.code, 'already_resubmitted');
  assert.equal(sent.body.request.status, 'pending');
  assert.equal(sent.body.request.resubmitted_from_id, sourceId);
  assert.equal(sent.body.request.previous_review_note, 'Corrige la placa y el modelo');
  assert.equal(sent.body.request.model, 'Corregido');
  assert.equal(sent.body.request.has_ownership_photo, true);

  const original = (await get(`/api/vehicle-requests/${sourceId}`, tokens.clientCondor)).body.request;
  assert.equal(original.status, 'rejected');
  assert.equal(original.plate, 'EDT001');
  assert.equal(original.model, 'Antes');
  assert.equal(original.has_resubmission, true);
  const staff = (await get('/api/vehicle-requests?status=pending', tokens.coordinator)).body.requests;
  assert.equal(staff.find((item) => item.id === sent.body.request.id).previous_review_note, 'Corrige la placa y el modelo');
  assert.equal((await post(`/api/vehicle-requests/${sent.body.request.id}/approve`, tokens.coordinator)).status, 200);
  assert.equal((await get(`/api/vehicle-requests/${sourceId}`, tokens.clientCondor)).body.request.status, 'rejected');
});
