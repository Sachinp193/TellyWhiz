// server/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env for local development

console.log('[DB] Initializing database pool...');
if (process.env.DATABASE_URL) {
  console.log('[DB] DATABASE_URL is defined. Host:', process.env.DATABASE_URL.split('@')[1]?.split(':')[0] || 'Not found'); // Log host part
} else {
  console.error('[DB] Error: DATABASE_URL is not defined!');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase connections from Vercel/Node.js to handle SSL certificates.
                              // 'rejectUnauthorized: false' is a common setting for development/testing,
                              // but for production, consider a more strict SSL configuration if Supabase provides CA certs.
  }
});

pool.on('error', (err: Error) => {
  console.error('[DB] Unexpected error on idle client', err);
  process.exit(1); // Exit the process if there's an unrecoverable database error
});

// Test connection on startup
pool.connect()
  .then(client => {
    console.log('[DB] Database pool successfully connected and tested (startup).');
    client.release();
  })
  .catch(err => {
    console.error('[DB] Error connecting to database on startup test:', err.stack);
  });

console.log('[DB] Database pool initialization logic complete.');

export default pool;