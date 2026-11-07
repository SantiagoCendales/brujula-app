import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

const URL_LIFETIME_SECONDS = 60 * 60;

function signature(photoId, expiresAt) {
  return createHmac('sha256', config.jwtSecret).update(`photo:${photoId}:${expiresAt}`).digest('base64url');
}

// An <img> cannot send the Authorization header, so photo URLs carry a short-lived signature instead.
// Expiry is rounded to the hour (valid 1–2 h) so the URL stays stable and the browser can cache the image.
export function signedPhotoUrl(photoId, now = Date.now()) {
  const expiresAt = (Math.floor(now / 1000 / URL_LIFETIME_SECONDS) + 2) * URL_LIFETIME_SECONDS;
  return `/api/photos/${photoId}/file?exp=${expiresAt}&sig=${signature(photoId, expiresAt)}`;
}

export function isValidPhotoSignature(photoId, exp, sig, now = Date.now()) {
  const expiresAt = Number(exp);
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 < now || typeof sig !== 'string') return false;
  const expected = Buffer.from(signature(photoId, expiresAt));
  const received = Buffer.from(sig);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Detects the type from the file's first bytes, not from its name or the Content-Type the client sends.
export function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  return null;
}

export function absolutePhotoPath(storageKey) {
  const absolutePath = path.resolve(config.uploadsDir, storageKey);
  if (!absolutePath.startsWith(config.uploadsDir + path.sep)) {
    throw new Error(`Storage key escapes the uploads directory: ${storageKey}`);
  }
  return absolutePath;
}

export async function savePhotoFile(storageKey, buffer) {
  const absolutePath = absolutePhotoPath(storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer, { flag: 'wx' });
}

// A file that is already gone counts as deleted.
export async function deletePhotoFile(storageKey) {
  try {
    await unlink(absolutePhotoPath(storageKey));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
