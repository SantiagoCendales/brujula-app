import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { bearer, loginAs, pool, request, setup, teardown } from './helpers.js';

let app;
let ids;
const tokens = {};

const FAKE_JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
const REQUIRED = ['plate', 'odometer', 'issue_found', 'issue_fixed'];
const SITE = { lat: 9.9347, lng: -84.0875, accuracy_m: 12 };

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

function uploadPhoto(activityId, token, category, buffer = FAKE_JPEG) {
  return request(app)
    .post(`/api/activities/${activityId}/photos`)
    .set(bearer(token))
    .field('category', category)
    .attach('photo', buffer, { filename: 'photo.jpg', contentType: 'image/jpeg' });
}

async function createAssigned(technicianKey = 'technician1') {
  const response = await post('/api/activities', tokens.coordinator, {
    vehicle_id: ids.vehicles.condor1,
    type: 'gps_install',
    technician_id: ids.users[technicianKey],
  });
  return response.body.activity.id;
}

async function fileExists(storageKey) {
  try {
    await access(path.join(process.env.UPLOADS_DIR, storageKey));
    return true;
  } catch {
    return false;
  }
}

describe('the full MVP flow', () => {
  test('assigned → on site → report ready → validated → delivered', async () => {
    const id = await createAssigned();

    const arrived = await post(`/api/activities/${id}/arrive`, tokens.technician1, SITE);
    assert.equal(arrived.status, 200);
    assert.equal(arrived.body.activity.status, 'on_site');
    assert.equal(arrived.body.activity.performed_by.id, ids.users.technician1);
    assert.ok(arrived.body.activity.arrival.at, 'the server stamps the arrival time');
    assert.equal(arrived.body.activity.arrival.lat, SITE.lat);

    const tooEarly = await post(`/api/activities/${id}/finish`, tokens.technician1, SITE);
    assert.equal(tooEarly.status, 422);
    assert.equal(tooEarly.body.error.code, 'incomplete_report');
    assert.deepEqual(tooEarly.body.error.details, { missing_photos: REQUIRED, missing_report: true });

    for (const category of REQUIRED) {
      const uploaded = await uploadPhoto(id, tokens.technician1, category);
      assert.equal(uploaded.status, 201);
    }
    const reported = await request(app)
      .patch(`/api/activities/${id}/report`)
      .set(bearer(tokens.technician1))
      .send({ report: 'Se instaló el GPS y reporta bien.' });
    assert.equal(reported.status, 200);
    assert.deepEqual(reported.body.activity.missing_photos, []);

    const finished = await post(`/api/activities/${id}/finish`, tokens.technician1, SITE);
    assert.equal(finished.status, 200);
    assert.equal(finished.body.activity.status, 'report_ready');
    assert.equal(finished.body.activity.technician, null, 'it leaves the technician hands');
    assert.ok(finished.body.activity.finish.at);

    const history = await request(app).get('/api/activities?view=history').set(bearer(tokens.technician1));
    assert.ok(history.body.activities.some((activity) => activity.id === id));

    const clientView = await request(app).get(`/api/activities/${id}`).set(bearer(tokens.clientCondor));
    assert.equal(clientView.body.activity.report, 'Se instaló el GPS y reporta bien.');
    assert.equal(clientView.body.activity.photos.length, 4);

    const image = await request(app).get(clientView.body.activity.photos[0].url);
    assert.equal(image.status, 200);
    assert.equal(image.headers['content-type'], 'image/jpeg');

    const validated = await post(`/api/activities/${id}/validate`, tokens.cec);
    assert.equal(validated.body.activity.status, 'validated');

    const delivered = await post(`/api/activities/${id}/deliver`, tokens.coordinator);
    assert.equal(delivered.body.activity.status, 'delivered');
    assert.deepEqual(
      delivered.body.activity.events.map((event) => event.type),
      ['created', 'assigned', 'arrived', 'finished', 'validated', 'delivered'],
    );
  });
});

describe('who can do what', () => {
  test("a technician cannot act on another technician's activity", async () => {
    const id = await createAssigned('technician1');
    const response = await post(`/api/activities/${id}/arrive`, tokens.technician2, SITE);
    assert.equal(response.status, 404);
  });

  test('after finishing, the technician can still see the activity but not edit it', async () => {
    const id = await createAssigned();
    await post(`/api/activities/${id}/arrive`, tokens.technician1, SITE);
    await pool.query(`update activities set status = 'report_ready', technician_id = null where id = $1`, [id]);

    const view = await request(app).get(`/api/activities/${id}`).set(bearer(tokens.technician1));
    assert.equal(view.status, 200);
    const edit = await request(app)
      .patch(`/api/activities/${id}/report`)
      .set(bearer(tokens.technician1))
      .send({ report: 'cambio tardío' });
    assert.equal(edit.status, 403);
  });

  test('arriving needs valid coordinates', async () => {
    const id = await createAssigned();
    const response = await post(`/api/activities/${id}/arrive`, tokens.technician1, { lat: 200, lng: 0 });
    assert.equal(response.status, 400);
  });

  test('arriving twice answers 409', async () => {
    const id = await createAssigned();
    await post(`/api/activities/${id}/arrive`, tokens.technician1, SITE);
    const again = await post(`/api/activities/${id}/arrive`, tokens.technician1, SITE);
    assert.equal(again.status, 409);
  });

  test('only CEC validates and only the coordinator delivers', async () => {
    const id = await createAssigned();
    await pool.query(`update activities set status = 'report_ready', technician_id = null where id = $1`, [id]);

    for (const token of [tokens.coordinator, tokens.technician1, tokens.clientCondor]) {
      assert.equal((await post(`/api/activities/${id}/validate`, token)).status, 403);
    }
    assert.equal((await post(`/api/activities/${id}/deliver`, tokens.cec)).status, 403);
    assert.equal((await post(`/api/activities/${id}/deliver`, tokens.coordinator)).status, 409, 'not validated yet');
  });
});

describe('photos', () => {
  let activityId;

  before(async () => {
    activityId = await createAssigned();
    await post(`/api/activities/${activityId}/arrive`, tokens.technician1, SITE);
  });

  test('a file that is not an image is rejected even if it claims to be one', async () => {
    const response = await uploadPhoto(activityId, tokens.technician1, 'plate', Buffer.from('not really a jpeg'));
    assert.equal(response.status, 400);
  });

  test('a file over 8 MB answers 413', async () => {
    const huge = Buffer.concat([FAKE_JPEG, Buffer.alloc(8 * 1024 * 1024)]);
    const response = await uploadPhoto(activityId, tokens.technician1, 'plate', huge);
    assert.equal(response.status, 413);
    assert.equal(response.body.error.code, 'file_too_large');
  });

  test('an unknown category is rejected', async () => {
    const response = await uploadPhoto(activityId, tokens.technician1, 'selfie');
    assert.equal(response.status, 400);
  });

  test('deleting a photo removes the file, then the row, and leaves an event', async () => {
    const uploaded = await uploadPhoto(activityId, tokens.technician1, 'other');
    const photoId = uploaded.body.photo_id;
    const { rows } = await pool.query('select storage_key from photos where id = $1', [photoId]);
    const storageKey = rows[0].storage_key;
    assert.ok(storageKey.startsWith(`${ids.companies.condor}/${activityId}/`), 'the key includes company and activity');
    assert.ok(await fileExists(storageKey));

    const deleted = await request(app).delete(`/api/photos/${photoId}`).set(bearer(tokens.technician1));
    assert.equal(deleted.status, 200);
    assert.equal(await fileExists(storageKey), false);
    assert.equal((await pool.query('select 1 from photos where id = $1', [photoId])).rowCount, 0);
    assert.equal(deleted.body.activity.events.at(-1).type, 'photo_deleted');
  });

  test('a tampered or expired photo URL answers 403', async () => {
    const uploaded = await uploadPhoto(activityId, tokens.technician1, 'plate');
    const { url } = uploaded.body.activity.photos.find((photo) => photo.id === uploaded.body.photo_id);

    const tampered = await request(app).get(url.replace(/sig=[^&]+/, 'sig=forged'));
    assert.equal(tampered.status, 403);
    const expired = await request(app).get(url.replace(/exp=\d+/, 'exp=1000'));
    assert.equal(expired.status, 403);
  });

  test('a client cannot upload photos', async () => {
    const response = await uploadPhoto(activityId, tokens.clientCondor, 'plate');
    assert.equal(response.status, 403);
  });
});
