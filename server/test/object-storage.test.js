import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { PassThrough, Readable } from 'node:stream';
import { test } from 'node:test';
import { promisify } from 'node:util';
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

test('configured S3 storage uses path-style addressing for a Supabase endpoint', async () => {
  const paths = [];
  const server = createServer((req, res) => {
    paths.push({ method: req.method, path: new URL(req.url, 'http://localhost').pathname });
    req.resume();
    req.on('end', () => res.end());
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await promisify(execFile)(process.execPath, [
      '--input-type=module',
      '-e',
      "const { storage } = await import('./server/src/lib/storage.js'); await storage.save('1/photo.png', Buffer.from('test')); await storage.remove('1/photo.png');",
    ], {
      cwd: new URL('../..', import.meta.url),
      env: {
        ...process.env,
        STORAGE_DRIVER: 's3',
        S3_ENDPOINT: `http://127.0.0.1:${server.address().port}/storage/v1/s3`,
        S3_BUCKET: 'brujula-photos',
        S3_REGION: 'test-region',
        S3_ACCESS_KEY_ID: 'test-key',
        S3_SECRET_ACCESS_KEY: 'test-secret',
        S3_FORCE_PATH_STYLE: 'true',
      },
    });
    assert.deepEqual(paths, [
      { method: 'PUT', path: '/storage/v1/s3/brujula-photos/1/photo.png' },
      { method: 'DELETE', path: '/storage/v1/s3/brujula-photos/1/photo.png' },
    ]);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
