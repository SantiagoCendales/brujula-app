import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { bearer, loginAs, pool, request, setup, teardown } from './helpers.js';

let app;
let ids;
const tokens = {};
const signature = [[[100, 100], [200, 300], [400, 200]]];

before(async () => {
  ({ app, ids } = await setup());
  for (const [key, email] of Object.entries({
    technician1: 'tecnico1@brujula.test',
    technician2: 'tecnico2@brujula.test',
    coordinator: 'coordinador@brujula.test',
    clientCondor: 'cliente.condor@brujula.test',
    clientCeiba: 'cliente.ceiba@brujula.test',
  })) tokens[key] = await loginAs(app, email);
  await pool.query(
    `update activities set status = 'on_site', performed_by = technician_id
     where id = any($1::int[])`,
    [[ids.activities[1], ids.activities[2]]],
  );
});

after(teardown);

function post(id, token, body) {
  return request(app).post(`/api/activities/${id}/receipt`).set(bearer(token)).send(body);
}

describe('receipt', () => {
  test('validates identity and nonempty signature; only the assigned technician may register it', async () => {
    const id = ids.activities[1];
    const signed = { kind: 'signed', signer_name: 'Persona Demo', signer_document: 'DEMO-123', signature };
    assert.equal((await post(id, tokens.technician1, { ...signed, signer_document: '' })).status, 400);
    assert.equal((await post(id, tokens.technician1, { ...signed, signature: [[[1, 1], [1, 1]]] })).status, 400);
    assert.equal((await post(id, tokens.coordinator, signed)).status, 403);
    assert.equal((await post(id, tokens.technician2, signed)).status, 404);
    assert.equal((await post(ids.activities[0], tokens.technician1, signed)).status, 404);
  });

  test('stores one signed receipt, visible only to authorized users and without personal data in audit events', async () => {
    const id = ids.activities[1];
    const signed = { kind: 'signed', signer_name: 'Persona Demo', signer_document: 'DEMO-123', signature };
    const response = await post(id, tokens.technician1, signed);
    assert.equal(response.status, 201);
    assert.equal(response.body.activity.receipt.signer_name, signed.signer_name);
    assert.equal(response.body.activity.receipt.signer_document, signed.signer_document);
    assert.deepEqual(response.body.activity.receipt.signature, signature);
    const event = response.body.activity.events.find((item) => item.type === 'receipt_recorded');
    assert.deepEqual(event.data, { kind: 'signed' });
    assert.equal((await post(id, tokens.technician1, { kind: 'nobody_present' })).status, 409);

    for (const token of [tokens.coordinator, tokens.clientCondor, tokens.technician1]) {
      const visible = await request(app).get(`/api/activities/${id}`).set(bearer(token));
      assert.equal(visible.status, 200);
      assert.equal(visible.body.activity.receipt.signer_document, signed.signer_document);
    }
    assert.equal((await request(app).get(`/api/activities/${id}`).set(bearer(tokens.clientCeiba))).status, 404);
  });

  test('records nobody present without signer data and rejects replacements', async () => {
    const id = ids.activities[2];
    const response = await post(id, tokens.technician2, { kind: 'nobody_present' });
    assert.equal(response.status, 201);
    assert.equal(response.body.activity.receipt.kind, 'nobody_present');
    assert.equal(response.body.activity.receipt.signer_name, null);
    assert.equal(response.body.activity.receipt.signature, null);
    assert.equal((await post(id, tokens.technician2, { kind: 'nobody_present' })).status, 409);
  });

  test('rejects a receipt after the activity leaves the on-site state', async () => {
    const id = ids.activities[2];
    await pool.query("update activities set status = 'report_ready' where id = $1", [id]);
    assert.equal((await post(id, tokens.technician2, { kind: 'nobody_present' })).status, 409);
  });
});
