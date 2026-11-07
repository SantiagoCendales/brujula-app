import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { bearer, loginAs, request, setup, teardown } from './helpers.js';

let app;
let ids;
const tokens = {};

const FAKE_JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
const REQUIRED = ['plate', 'odometer', 'issue_found', 'issue_fixed'];
const SITE = { lat: 9.9347, lng: -84.0875 };

before(async () => {
  ({ app, ids } = await setup());
  const emails = {
    coordinator: 'coordinador@brujula.test',
    cec: 'cec@brujula.test',
    technician1: 'tecnico1@brujula.test',
    technician2: 'tecnico2@brujula.test',
    clientCondor: 'cliente.condor@brujula.test',
  };
  for (const [key, email] of Object.entries(emails)) {
    tokens[key] = await loginAs(app, email);
  }
});

after(teardown);

function post(path, token, body = {}) {
  return request(app).post(path).set(bearer(token)).send(body);
}

function uploadPhoto(activityId, token, category) {
  return request(app)
    .post(`/api/activities/${activityId}/photos`)
    .set(bearer(token))
    .field('category', category)
    .attach('photo', FAKE_JPEG, { filename: 'photo.jpg', contentType: 'image/jpeg' });
}

// Runs the real flow up to "report ready", performed by technician1.
async function createReportReady() {
  const created = await post('/api/activities', tokens.coordinator, {
    vehicle_id: ids.vehicles.condor1,
    type: 'maintenance',
    technician_id: ids.users.technician1,
  });
  const id = created.body.activity.id;
  await post(`/api/activities/${id}/arrive`, tokens.technician1, SITE);
  for (const category of REQUIRED) await uploadPhoto(id, tokens.technician1, category);
  await request(app).patch(`/api/activities/${id}/report`).set(bearer(tokens.technician1)).send({ report: 'Primera versión' });
  await post(`/api/activities/${id}/finish`, tokens.technician1, SITE);
  return id;
}

describe('returning a report', () => {
  test('CEC returns it with a note and it goes back to the technician who performed it', async () => {
    const id = await createReportReady();
    const response = await post(`/api/activities/${id}/return`, tokens.cec, { note: 'La foto del kilometraje no se lee' });

    assert.equal(response.status, 200);
    const { activity } = response.body;
    assert.equal(activity.status, 'returned');
    assert.equal(activity.technician.id, ids.users.technician1);
    assert.equal(activity.events.at(-1).type, 'returned');
    assert.equal(activity.events.at(-1).note, 'La foto del kilometraje no se lee');

    const pending = await request(app).get('/api/activities?view=pending').set(bearer(tokens.technician1));
    assert.ok(pending.body.activities.some((item) => item.id === id), 'it shows up in their pending list');
    const history = await request(app).get('/api/activities?view=history').set(bearer(tokens.technician1));
    assert.ok(!history.body.activities.some((item) => item.id === id), 'and not in their history');
  });

  test('a note is required', async () => {
    const id = await createReportReady();
    const response = await post(`/api/activities/${id}/return`, tokens.cec, { note: ' ' });
    assert.equal(response.status, 400);
  });

  test('only CEC can return, and only a ready report', async () => {
    const id = await createReportReady();
    for (const token of [tokens.coordinator, tokens.technician1]) {
      assert.equal((await post(`/api/activities/${id}/return`, token, { note: 'Revisar' })).status, 403);
    }
    await post(`/api/activities/${id}/validate`, tokens.cec);
    assert.equal((await post(`/api/activities/${id}/return`, tokens.cec, { note: 'Revisar' })).status, 409);
  });

  test('the client does not see the report while it is being corrected', async () => {
    const id = await createReportReady();
    await post(`/api/activities/${id}/return`, tokens.cec, { note: 'Falta detalle' });
    const response = await request(app).get(`/api/activities/${id}`).set(bearer(tokens.clientCondor));
    assert.equal(response.body.activity.status, 'returned');
    assert.equal(response.body.activity.report, null);
  });
});

describe('correcting and resubmitting', () => {
  test('edits while returned are logged as corrections, then the report goes back to CEC', async () => {
    const id = await createReportReady();
    await post(`/api/activities/${id}/return`, tokens.cec, { note: 'Agregar foto extra y detallar' });

    const edited = await request(app)
      .patch(`/api/activities/${id}/report`)
      .set(bearer(tokens.technician1))
      .send({ report: 'Versión corregida' });
    const correction = edited.body.activity.events.at(-1);
    assert.equal(correction.type, 'correction');
    assert.deepEqual(correction.data, { field: 'report', before: 'Primera versión', after: 'Versión corregida' });

    const photo = await uploadPhoto(id, tokens.technician1, 'other');
    assert.equal(photo.body.activity.events.at(-1).type, 'photo_added');

    const resubmitted = await post(`/api/activities/${id}/resubmit`, tokens.technician1);
    assert.equal(resubmitted.status, 200);
    assert.equal(resubmitted.body.activity.status, 'report_ready');
    assert.equal(resubmitted.body.activity.technician, null);

    const validated = await post(`/api/activities/${id}/validate`, tokens.cec);
    assert.equal(validated.body.activity.status, 'validated');
  });

  test('resubmitting still requires the required photos', async () => {
    const id = await createReportReady();
    await post(`/api/activities/${id}/return`, tokens.cec, { note: 'Rehacer la foto de la placa' });
    const detail = await request(app).get(`/api/activities/${id}`).set(bearer(tokens.technician1));
    const platePhoto = detail.body.activity.photos.find((item) => item.category === 'plate');
    await request(app).delete(`/api/photos/${platePhoto.id}`).set(bearer(tokens.technician1));

    const response = await post(`/api/activities/${id}/resubmit`, tokens.technician1);
    assert.equal(response.status, 422);
    assert.deepEqual(response.body.error.details.missing_photos, ['plate']);
  });

  test('another technician cannot resubmit', async () => {
    const id = await createReportReady();
    await post(`/api/activities/${id}/return`, tokens.cec, { note: 'Corregir' });
    const response = await post(`/api/activities/${id}/resubmit`, tokens.technician2);
    assert.equal(response.status, 404);
  });
});
