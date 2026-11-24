import { hashPassword } from '../auth/password.js';
import { isMainModule } from '../lib/isMainModule.js';
import { pool } from './pool.js';

const MIN_PASSWORD_LENGTH = 12;

// Creates one admin without touching existing data. Meant for the first real account in production, where
// the demo seed is disabled. Credentials come from the environment, never from a file of the repo.
export async function createAdmin({ name, email, password }) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) throw new Error('ADMIN_EMAIL is not a valid email.');
  if (!name?.trim()) throw new Error('ADMIN_NAME is required.');
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  const { rows } = await pool.query(
    `insert into users (name, email, password_hash, role) values ($1, $2, $3, 'admin')
     on conflict (email) do nothing returning id`,
    [name.trim(), normalizedEmail, await hashPassword(password)],
  );
  if (!rows[0]) throw new Error('A user with that email already exists.');
  return rows[0].id;
}

if (isMainModule(import.meta.url)) {
  try {
    await createAdmin({
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    console.log('Admin created.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
