import { Router } from 'express';
import { authenticate, requireRole } from '../auth/middleware.js';
import { pool, withTransaction } from '../db/pool.js';
import { ensureHolder, findVisibleActivity, getActivityDetail, invalidStatus, lockActivity, recordEvent } from '../domain/activities.js';
import { TECHNICIAN_EDITABLE_STATUSES } from '../domain/rules.js';
import { HttpError } from '../lib/errors.js';
import { absolutePhotoPath, deletePhotoFile, isValidPhotoSignature } from '../lib/photos.js';
import { notifyActivityChanged } from '../realtime/activityEvents.js';
import { idSchema, validate } from '../lib/validation.js';

export const photosRouter = Router();

// No Authorization header here (an <img> cannot send it): access comes from the signed URL,
// which the API only hands out to users allowed to see the photo.
photosRouter.get('/:id/file', async (req, res) => {
  const id = validate(idSchema, req.params.id);
  if (!isValidPhotoSignature(id, req.query.exp, req.query.sig)) {
    throw new HttpError(403, 'forbidden', 'El enlace de la foto venció o no es válido');
  }

  const { rows } = await pool.query('select storage_key, mime_type from photos where id = $1', [id]);
  const photo = rows[0];
  if (!photo) throw new HttpError(404, 'not_found', 'Foto no encontrada');

  res.set({
    'Cache-Control': 'private, max-age=3600',
    // The Android app loads the page from its own origin; without this the browser blocks the image.
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  res.type(photo.mime_type);
  res.sendFile(absolutePhotoPath(photo.storage_key));
});

photosRouter.delete('/:id', authenticate, requireRole('technician'), async (req, res) => {
  const id = validate(idSchema, req.params.id);
  const { rows } = await pool.query('select id, activity_id, category, storage_key from photos where id = $1', [id]);
  const photo = rows[0];
  if (!photo) throw new HttpError(404, 'not_found', 'Foto no encontrada');

  const activity = await findVisibleActivity(pool, photo.activity_id, req.user);
  ensureHolder(activity, req.user);
  if (!TECHNICIAN_EDITABLE_STATUSES.includes(activity.status)) throw invalidStatus(activity.status);

  // File first, then the row: if deleting the file fails, the row stays so it can be retried.
  await deletePhotoFile(photo.storage_key);
  await withTransaction(async (db) => {
    const locked = await lockActivity(db, activity.id);
    if (!TECHNICIAN_EDITABLE_STATUSES.includes(locked.status)) throw invalidStatus(locked.status);
    await db.query('delete from photos where id = $1', [id]);
    await recordEvent(db, {
      activityId: activity.id,
      userId: req.user.id,
      type: 'photo_deleted',
      data: { photo_id: id, category: photo.category },
    });
  });

  await notifyActivityChanged(pool, activity.id);
  res.json({ activity: await getActivityDetail(pool, activity.id, req.user) });
});
