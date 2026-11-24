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
    admin: 'admin@brujula.test',
    cec: 'cec@brujula.test',
    technician1: 'tecnico1@brujula.test',
    technician3: 'tecnico3@brujula.test',
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

describe('client isolation', () => {
  test('a client only sees its own company', async () => {
    const response = await get('/api/companies', tokens.clientCondor);
    assert.deepEqual(
      response.body.companies.map((company) => company.id),
      [ids.companies.condor],
    );
  });

  test('a client only lists its own vehicles', async () => {
    const response = await get('/api/vehicles', tokens.clientCondor);
    assert.equal(response.status, 200);
    assert.ok(response.body.vehicles.length > 0);
    assert.ok(response.body.vehicles.every((vehicle) => vehicle.company.id === ids.companies.condor));
  });

  test("another company's vehicle answers 404, not 403", async () => {
    const response = await get(`/api/vehicles/${ids.vehicles.ceiba1}`, tokens.clientCondor);
    assert.equal(response.status, 404);
  });

  test("filtering by another company's id does not leak its vehicles", async () => {
    const response = await get(`/api/vehicles?company_id=${ids.companies.ceiba}`, tokens.clientCondor);
    assert.deepEqual(response.body.vehicles, []);
  });

  test('vehicle history only includes activities of that vehicle', async () => {
    const response = await get(`/api/vehicles/${ids.vehicles.condor1}`, tokens.clientCondor);
    assert.equal(response.status, 200);
    assert.ok(response.body.history.every((activity) => activity.vehicle.id === ids.vehicles.condor1));
  });
});

describe('technician visibility', () => {
  test('sees only the vehicles of the activities assigned to them', async () => {
    const response = await get('/api/vehicles', tokens.technician1);
    assert.deepEqual(
      response.body.vehicles.map((vehicle) => vehicle.id),
      [ids.vehicles.condor2],
    );
  });

  test('a technician with nothing assigned sees no vehicles', async () => {
    const response = await get('/api/vehicles', tokens.technician3);
    assert.deepEqual(response.body.vehicles, []);
  });

  test("another technician's vehicle answers 404", async () => {
    const response = await get(`/api/vehicles/${ids.vehicles.ceiba1}`, tokens.technician1);
    assert.equal(response.status, 404);
  });
});

describe('internal roles', () => {
  test('the coordinator sees every vehicle', async () => {
    const response = await get('/api/vehicles', tokens.coordinator);
    assert.equal(response.body.vehicles.length, Object.keys(ids.vehicles).length);
  });

  test('plate search is partial and case-insensitive', async () => {
    const response = await get('/api/vehicles?plate=demo-1', tokens.coordinator);
    assert.deepEqual(response.body.vehicles.map((vehicle) => vehicle.plate).sort(), ['DEMO-101', 'DEMO-102']);
  });

  test('the coordinator lists only active technicians', async () => {
    const response = await get('/api/users?role=admin', tokens.coordinator);
    assert.equal(response.status, 200);
    assert.ok(response.body.users.length > 0);
    assert.ok(response.body.users.every((user) => user.role === 'technician'));
  });

  test('clients and technicians cannot list users', async () => {
    for (const token of [tokens.clientCondor, tokens.technician1]) {
      const response = await get('/api/users', token);
      assert.equal(response.status, 403);
      assert.equal(response.body.error.code, 'forbidden');
    }
  });

  test('catalogs are available to any signed-in user', async () => {
    const response = await get('/api/catalogs', tokens.clientCeiba);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.required_photos, ['plate', 'odometer', 'issue_found', 'issue_fixed']);
  });
});

describe('POST /api/vehicles', () => {
  test('the coordinator creates a vehicle and the plate is normalized', async () => {
    const response = await request(app)
      .post('/api/vehicles')
      .set(bearer(tokens.coordinator))
      .send({ company_id: ids.companies.ceiba, plate: ' demo 303 ', make: 'Ford' });
    assert.equal(response.status, 201);
    assert.equal(response.body.vehicle.plate, 'DEMO303');
  });

  test('a repeated plate answers 409 duplicate', async () => {
    const response = await request(app)
      .post('/api/vehicles')
      .set(bearer(tokens.coordinator))
      .send({ company_id: ids.companies.condor, plate: 'demo-101' });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, 'duplicate');
  });

  test('a client cannot create vehicles', async () => {
    const response = await request(app)
      .post('/api/vehicles')
      .set(bearer(tokens.clientCondor))
      .send({ company_id: ids.companies.condor, plate: 'DEMO-999' });
    assert.equal(response.status, 403);
  });
});

test('all authorized roles can see the new fields without exposing another company', async () => {
  const id = ids.vehicles.condor2;
  const empty = await get(`/api/vehicles/${id}`, tokens.clientCondor);
  assert.deepEqual(
    [empty.body.vehicle.vin, empty.body.vehicle.year, empty.body.vehicle.color],
    [null, null, null],
  );
  await pool.query('update vehicles set vin = $2, year = $3, color = $4 where id = $1', [id, 'TESTVIN0000000001', 2024, 'Azul']);
  for (const role of ['admin', 'coordinator', 'cec', 'technician1', 'clientCondor']) {
    const detail = await get(`/api/vehicles/${id}`, tokens[role]);
    assert.equal(detail.status, 200);
    assert.deepEqual(
      [detail.body.vehicle.vin, detail.body.vehicle.year, detail.body.vehicle.color],
      ['TESTVIN0000000001', 2024, 'Azul'],
    );
    const list = await get('/api/vehicles', tokens[role]);
    const vehicle = list.body.vehicles.find((item) => item.id === id);
    assert.deepEqual([vehicle.vin, vehicle.year, vehicle.color], ['TESTVIN0000000001', 2024, 'Azul']);
  }
  assert.equal((await get(`/api/vehicles/${id}`, tokens.clientCeiba)).status, 404);
});

test('a technician sees the full history only while assigned to the vehicle', async () => {
  const { rows: vehicles } = await pool.query(
    "insert into vehicles (company_id, plate) values ($1, 'DEMO-HISTORY') returning id",
    [ids.companies.condor],
  );
  const vehicleId = vehicles[0].id;
  const { rows: activities } = await pool.query(
    `insert into activities (company_id, vehicle_id, type, status, created_by, technician_id, performed_by)
     values ($1, $2, 'inspection', 'assigned', $3, $4, null),
            ($1, $2, 'inspection', 'delivered', $3, null, $5),
            ($1, $2, 'inspection', 'delivered', $3, null, $4)
     returning id`,
    [ids.companies.condor, vehicleId, ids.users.coordinator, ids.users.technician1, ids.users.technician2],
  );
  const assigned = await get(`/api/vehicles/${vehicleId}`, tokens.technician1);
  assert.equal(assigned.status, 200);
  assert.deepEqual(new Set(assigned.body.history.map((item) => item.id)), new Set(activities.map((item) => item.id)));

  await pool.query('update activities set technician_id = null where id = $1', [activities[0].id]);
  const previousWork = await get(`/api/vehicles/${vehicleId}`, tokens.technician1);
  assert.equal(previousWork.status, 200);
  assert.deepEqual(previousWork.body.history.map((item) => item.id), [activities[2].id]);
});
