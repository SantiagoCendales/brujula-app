import { createHmac, timingSafeEqual } from 'node:crypto';
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
