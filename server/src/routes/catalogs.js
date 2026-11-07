import { Router } from 'express';
import { authenticate } from '../auth/middleware.js';
import { ACTIVITY_TYPES, PHOTO_CATEGORIES, REQUIRED_PHOTOS, STATUSES } from '../domain/rules.js';

export const catalogsRouter = Router();

catalogsRouter.get('/', authenticate, (_req, res) => {
  res.json({
    activity_types: ACTIVITY_TYPES,
    photo_categories: PHOTO_CATEGORIES,
    required_photos: REQUIRED_PHOTOS,
    statuses: STATUSES,
  });
});
