import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { pool, request, setup, teardown } from './helpers.js';

const { seed } = await import('../src/db/seed.js');

let app;

before(async () => {
  ({ app } = await setup());
  await seed({ password: 'test-password', demo: true });
});

after(teardown);

test('the demo data covers every MVP status', async () => {
  const { rows } = await pool.query('select distinct status from activities order by status');
  assert.deepEqual(
    rows.map((row) => row.status).sort(),
    ['assigned', 'delivered', 'on_site', 'report_ready', 'requested', 'validated'],
  );
});

test('demo activities are consistent with the business rules', async () => {
  const { rows } = await pool.query(`
    select a.id, a.status, a.technician_id, a.performed_by, a.report, a.arrived_at, a.finished_at,
           array(select distinct category::text from photos p where p.activity_id = a.id) as categories
    from activities a`);

  for (const activity of rows) {
    const finished = ['report_ready', 'validated', 'delivered'].includes(activity.status);
    if (finished) {
      assert.equal(activity.technician_id, null, `activity ${activity.id} left the technician hands`);
      assert.ok(activity.performed_by && activity.arrived_at && activity.finished_at && activity.report);
      for (const category of ['plate', 'odometer', 'issue_found', 'issue_fixed']) {
        assert.ok(activity.categories.includes(category), `activity ${activity.id} has its ${category} photo`);
      }
    }
    if (activity.status === 'on_site') assert.equal(activity.technician_id, activity.performed_by);
  }
});

test('every demo photo has its file and is served as an image', async () => {
  const { rows } = await pool.query('select id, storage_key from photos');
  assert.ok(rows.length > 0);
  for (const { storage_key: storageKey } of rows) {
    await access(path.join(process.env.UPLOADS_DIR, storageKey));
  }

  const { signedPhotoUrl } = await import('../src/lib/photos.js');
  const image = await request(app).get(signedPhotoUrl(rows[0].id));
  assert.equal(image.status, 200);
  assert.equal(image.headers['content-type'], 'image/png');
});
