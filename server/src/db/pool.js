import pg from 'pg';
import { config } from '../config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  // The certificate is verified so nobody can impersonate the database. Managed providers (Neon, Supabase)
  // use public CAs; a private CA can be supplied through DATABASE_SSL_CA.
  ssl: config.databaseSsl ? { rejectUnauthorized: true, ca: config.databaseSslCa } : undefined,
});

export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
