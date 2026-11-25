import assert from 'node:assert/strict';
import { PassThrough, Readable } from 'node:stream';
import { test } from 'node:test';
import './helpers.js';

const { createObjectStorage } = await import('../src/lib/storage.js');

function fakeBucket() {
  const objects = new Map();
  const client = {
    async send(command) {
      const { Key, Body } = command.input;
      const name = command.constructor.name;
      if (name === 'PutObjectCommand') objects.set(Key, Body);
      else if (name === 'DeleteObjectCommand') objects.delete(Key);
      else if (name === 'GetObjectCommand') {
        if (!objects.has(Key)) throw Object.assign(new Error('missing'), { name: 'NoSuchKey' });
        return { Body: Readable.from([objects.get(Key)]), ContentLength: objects.get(Key).length };
      }
      return {};
    },
  };
  return { objects, storage: createObjectStorage(client, 'photos') };
}

function fakeResponse() {
  const res = new PassThrough();
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.headers = {};
  res.set = (name, value) => { res.headers[name] = value; };
  return { res, body: () => Buffer.concat(chunks) };
}

test('object storage saves, serves and deletes a photo', async () => {
  const { objects, storage } = fakeBucket();
  await storage.save('1/2/a.png', Buffer.from('image-bytes'));
  assert.equal(objects.size, 1);

  const { res, body } = fakeResponse();
  await storage.send(res, '1/2/a.png');
  assert.equal(body().toString(), 'image-bytes');
  assert.equal(res.headers['Content-Length'], '11');

  await storage.remove('1/2/a.png');
  assert.equal(objects.size, 0);
});

test('object storage answers 404 for a missing photo', async () => {
  const { storage } = fakeBucket();
  await assert.rejects(storage.send(fakeResponse().res, 'nope.png'), { status: 404 });
});
