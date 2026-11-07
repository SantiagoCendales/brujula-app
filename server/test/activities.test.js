import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { bearer, loginAs, pool, request, setup, teardown } from './helpers.js';

let app;
let ids;
const tokens = {};

before(async () => {
  ({ app, ids } = await setup());
  const emails = {
    coordinator: 'coordinador@brujula.test',
    cec: 'cec@brujula.test',
    technician1: 'tecnico1@brujula.test',
    technician2: 'tecnico2@brujula.test',
    clientCondor: 'cliente.condor@brujula.test',
    clientCeiba: 'cliente.ceiba@brujula.test',
  };
  for (const [key, email] of Object.entries(emails)) {
    tokens[key] = await loginAs(app, email);
  }
});

after(teardown);

function get(path, token) {
  return request(app).get(path).set(bearer(token));
}

function post(path, token, body = {}) {
  return request(app).post(path).set(bearer(token)).send(body);
}

async function insertActivity({ company, vehicle, status, technicianId = null, performedBy = null, report = '' }) {
  const { rows } = await pool.query(
    `insert into activities (company_id, vehicle_id, type, status, created_by, technician_id, performed_by, report)
     values ($1, $2, 'inspection', $3, $4, $5, $6, $7) returning id`,
    [company, vehicle, status, ids.users.coordinator, technicianId, performedBy, report],
  );
  return rows[0].id;
}

describe('creating activities', () => {
  test('a client requests service for its own vehicle', async () => {
    const response = await post('/api/activities', tokens.clientCondor, {
      vehicle_id: ids.vehicles.condor1,
      type: 'maintenance',
      description: 'Revisar cámara',
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.activity.status, 'requested');
    assert.equal(response.body.activity.technician, null);
    assert.equal(response.body.activity.company.id, ids.companies.condor);
    assert.deepEqual(response.body.activity.events, [], 'clients do not see the audit log');
  });

  test("a client cannot use another company's vehicle", async () => {
    const response = await post('/api/activities', tokens.clientCondor, {
      vehicle_id: ids.vehicles.ceiba1,
      type: 'maintenance',
    });
    assert.equal(response.status, 404);
  });

  test('a client cannot assign a technician', async () => {
    const response = await post('/api/activities', tokens.clientCondor, {
      vehicle_id: ids.vehicles.condor1,
      type: 'maintenance',
      technician_id: ids.users.technician1,
    });
    assert.equal(response.status, 403);
  });

  test('an unknown activity type is rejected', async () => {
    const response = await post('/api/activities', tokens.coordinator, {
      vehicle_id: ids.vehicles.condor1,
      type: 'teleport',
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'validation_error');
  });

  test('the coordinator creates and assigns in one step, leaving two events', async () => {
    const response = await post('/api/activities', tokens.coordinator, {
      vehicle_id: ids.vehicles.ceiba2,
      type: 'gps_install',
      technician_id: ids.users.technician3,
      scheduled_for: '2026-11-08T14:00:00.000Z',
    });
    assert.equal(response.status, 201);
    const { activity } = response.body;
    assert.equal(activity.status, 'assigned');
    assert.equal(activity.technician.id, ids.users.technician3);
    assert.equal(activity.company.id, ids.companies.ceiba, 'the company comes from the vehicle');
    assert.deepEqual(
      activity.events.map((event) => event.type),
      ['created', 'assigned'],
    );
  });

  test('technicians and CEC cannot create activities', async () => {
    for (const token of [tokens.technician1, tokens.cec]) {
      const response = await post('/api/activities', token, { vehicle_id: ids.vehicles.condor1, type: 'maintenance' });
      assert.equal(response.status, 403);
    }
  });
});

describe('assigning', () => {
  test('the coordinator assigns and then reassigns a requested activity', async () => {
    const requestedId = ids.activities[0];
    const first = await post(`/api/activities/${requestedId}/assign`, tokens.coordinator, {
      technician_id: ids.users.technician2,
    });
    assert.equal(first.status, 200);
    assert.equal(first.body.activity.status, 'assigned');
    assert.equal(first.body.activity.technician.id, ids.users.technician2);

    const second = await post(`/api/activities/${requestedId}/assign`, tokens.coordinator, {
      technician_id: ids.users.technician3,
    });
    assert.equal(second.body.activity.technician.id, ids.users.technician3);
    assert.equal(second.body.activity.events.at(-1).from_status, 'assigned');
  });

  test('only active technicians can be assigned', async () => {
    const response = await post(`/api/activities/${ids.activities[1]}/assign`, tokens.coordinator, {
      technician_id: ids.users.clientCondor,
    });
    assert.equal(response.status, 400);
  });

  test('an activity already on site cannot be reassigned', async () => {
    const onSiteId = await insertActivity({
      company: ids.companies.condor,
      vehicle: ids.vehicles.condor1,
      status: 'on_site',
      technicianId: ids.users.technician1,
      performedBy: ids.users.technician1,
    });
    const response = await post(`/api/activities/${onSiteId}/assign`, tokens.coordinator, {
      technician_id: ids.users.technician2,
    });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, 'invalid_status');
  });

  test('a technician cannot assign', async () => {
    const response = await post(`/api/activities/${ids.activities[1]}/assign`, tokens.technician1, {
      technician_id: ids.users.technician1,
    });
    assert.equal(response.status, 403);
  });
});

describe('client visibility', () => {
  test('a client only lists activities of its company', async () => {
    const response = await get('/api/activities', tokens.clientCeiba);
    assert.ok(response.body.activities.length > 0);
    assert.ok(response.body.activities.every((activity) => activity.company.id === ids.companies.ceiba));
  });

  test("another company's activity answers 404", async () => {
    const response = await get(`/api/activities/${ids.activities[1]}`, tokens.clientCeiba);
    assert.equal(response.status, 404);
  });

  test('the report and photos stay hidden until the report is ready', async () => {
    const hiddenId = await insertActivity({
      company: ids.companies.ceiba,
      vehicle: ids.vehicles.ceiba2,
      status: 'on_site',
      technicianId: ids.users.technician2,
      performedBy: ids.users.technician2,
      report: 'Borrador del técnico',
    });
    const hidden = await get(`/api/activities/${hiddenId}`, tokens.clientCeiba);
    assert.equal(hidden.body.activity.report, null);

    await pool.query(`update activities set status = 'report_ready', technician_id = null where id = $1`, [hiddenId]);
    const visible = await get(`/api/activities/${hiddenId}`, tokens.clientCeiba);
    assert.equal(visible.body.activity.report, 'Borrador del técnico');
  });
});

describe('technician visibility', () => {
  test("another technician's activity answers 404", async () => {
    const response = await get(`/api/activities/${ids.activities[2]}`, tokens.technician1);
    assert.equal(response.status, 404);
  });

  test('the pending view only lists what they hold now', async () => {
    const response = await get('/api/activities?view=pending', tokens.technician1);
    assert.ok(response.body.activities.length > 0);
    assert.ok(response.body.activities.every((activity) => activity.technician?.id === ids.users.technician1));
  });

  test('they see past work on a vehicle they are assigned to, done by someone else', async () => {
    const pastId = await insertActivity({
      company: ids.companies.condor,
      vehicle: ids.vehicles.condor2,
      status: 'delivered',
      performedBy: ids.users.technician2,
      report: 'Se cambió el cableado',
    });
    const response = await get(`/api/activities/${pastId}`, tokens.technician1);
    assert.equal(response.status, 200);
    assert.equal(response.body.activity.report, 'Se cambió el cableado');

    const pending = await get('/api/activities?view=pending', tokens.technician1);
    assert.ok(!pending.body.activities.some((activity) => activity.id === pastId));
  });

  test('the history view lists what they performed after finishing', async () => {
    const doneId = await insertActivity({
      company: ids.companies.ceiba,
      vehicle: ids.vehicles.ceiba1,
      status: 'validated',
      performedBy: ids.users.technician1,
    });
    const response = await get('/api/activities?view=history', tokens.technician1);
    assert.ok(response.body.activities.some((activity) => activity.id === doneId));
    assert.ok(response.body.activities.every((activity) => activity.performed_by?.id === ids.users.technician1));
  });
});

describe('GET /api/activities/counts', () => {
  test('counts per status only what each role can see', async () => {
    const all = await get('/api/activities', tokens.coordinator);
    const counts = await get('/api/activities/counts', tokens.coordinator);
    assert.equal(counts.status, 200);
    assert.equal(counts.body.total, all.body.activities.length);
    for (const activity of all.body.activities) assert.ok(counts.body.counts[activity.status] > 0);

    const ceibaList = await get('/api/activities', tokens.clientCeiba);
    const ceibaCounts = await get('/api/activities/counts', tokens.clientCeiba);
    assert.equal(ceibaCounts.body.total, ceibaList.body.activities.length, 'a client only counts its company');
    assert.ok(ceibaCounts.body.total < counts.body.total);
  });
});

describe('internal roles', () => {
  test('CEC sees every activity, including the audit log', async () => {
    const response = await get(`/api/activities/${ids.activities[2]}`, tokens.cec);
    assert.equal(response.status, 200);
    assert.ok(response.body.activity.events.length > 0);
    assert.deepEqual(response.body.activity.missing_photos, ['plate', 'odometer', 'issue_found', 'issue_fixed']);
  });
});
