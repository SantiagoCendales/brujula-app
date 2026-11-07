import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainModule } from '../lib/isMainModule.js';
import { pool, withTransaction } from './pool.js';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

// Applies, in order, the .sql files in migrations/ that have not been applied yet.
// An applied migration is never edited: changes go in a new file.
export async function migrate() {
  await pool.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`);

  const { rows } = await pool.query('select name from schema_migrations');
  const applied = new Set(rows.map((row) => row.name));
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    await withTransaction(async (db) => {
      await db.query(sql);
      await db.query('insert into schema_migrations (name) values ($1)', [file]);
    });
    console.log(`Applied migration: ${file}`);
  }
}

if (isMainModule(import.meta.url)) {
  try {
    await migrate();
    console.log('Database is up to date.');
  } finally {
    await pool.end();
  }
}
