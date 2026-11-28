import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { config } from '../config.js';
import { HttpError } from './errors.js';

function notFound() {
  return new HttpError(404, 'not_found', 'Foto no encontrada');
}

// Files live on the server disk. Fine for development; hosting platforms wipe the disk on every deploy.
export function createLocalStorage(rootDir) {
  function absolutePath(storageKey) {
    const resolved = path.resolve(rootDir, storageKey);
    if (!resolved.startsWith(rootDir + path.sep)) {
      throw new Error(`Storage key escapes the uploads directory: ${storageKey}`);
    }
    return resolved;
  }

  return {
    async save(storageKey, buffer) {
      const target = absolutePath(storageKey);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, buffer, { flag: 'wx' });
    },
    // A file that is already gone counts as deleted.
    async remove(storageKey) {
      try {
        await unlink(absolutePath(storageKey));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    },
    send(res, storageKey) {
      return new Promise((resolve, reject) => {
        res.sendFile(absolutePath(storageKey), (error) => {
          if (!error) return resolve();
          return reject(error.code === 'ENOENT' ? notFound() : error);
        });
      });
    },
  };
}

// Any S3-compatible bucket (Cloudflare R2, AWS S3, MinIO). The bucket must stay private: files only leave
// through the API, which checks permissions first.
export function createObjectStorage(client, bucket) {
  return {
    async save(storageKey, buffer) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: buffer }));
    },
    // Deleting a key that does not exist succeeds in S3, so retries are safe.
    async remove(storageKey) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
    },
    async send(res, storageKey) {
      let object;
      try {
        object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
      } catch (error) {
        if (error.name === 'NoSuchKey') throw notFound();
        throw error;
      }
      if (object.ContentLength !== undefined) res.set('Content-Length', String(object.ContentLength));
      await pipeline(object.Body, res);
    },
  };
}

function createConfiguredStorage() {
  if (config.storage.driver !== 's3') return createLocalStorage(config.uploadsDir);
  const client = new S3Client({
    region: config.storage.region,
    endpoint: config.storage.endpoint,
    forcePathStyle: config.storage.forcePathStyle,
    credentials: { accessKeyId: config.storage.accessKeyId, secretAccessKey: config.storage.secretAccessKey },
  });
  return createObjectStorage(client, config.storage.bucket);
}

export const storage = createConfiguredStorage();
