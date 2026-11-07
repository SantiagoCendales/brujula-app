import { z } from 'zod';
import { HttpError } from './errors.js';

z.config(z.locales.es());

export const idSchema = z.coerce.number().int().positive();

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
    throw new HttpError(400, 'validation_error', 'Datos inválidos', details);
  }
  return result.data;
}

export function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}
