import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

process.env.DATABASE_URL = 'postgres://localhost/activity-search-test';
process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough-1234567890';
const { listActivities } = await import('../src/domain/activities.js');

async function search(user, filters) {
  let query;
  const db = {
    async query(sql, params) {
      query = { sql, params };
      return { rows: [] };
    },
  };
  await listActivities(db, user, filters);
  return query;
}

describe('activity plate search', () => {
  test('applies a partial, case-insensitive, literal plate filter before the limit', async () => {
    const { sql, params } = await search({ role: 'coordinator' }, { plate: 'demo_%\\1' });
    assert.deepEqual(params, ['%DEMO\\_\\%\\\\1%']);
    assert.match(sql, /v\.plate like \$1.*limit 200/s);
  });

  test('combines the plate with the client company scope', async () => {
    const { sql, params } = await search({ role: 'client', company_id: 7 }, { plate: 'demo' });
    assert.match(sql, /a\.company_id = \$1/);
    assert.match(sql, /v\.plate like \$2/);
    assert.deepEqual(params, [7, '%DEMO%']);
  });

  test('combines the plate with the technician history scope', async () => {
    const { sql, params } = await search({ role: 'technician', id: 8 }, { plate: 'demo', view: 'history' });
    assert.match(sql, /a\.technician_id = \$1/);
    assert.match(sql, /a\.performed_by = \$1/);
    assert.match(sql, /v\.plate like \$2/);
    assert.match(sql, /a\.performed_by = \$3/);
    assert.equal(params[0], 8);
    assert.equal(params[1], '%DEMO%');
    assert.equal(params[2], 8);
  });
});
