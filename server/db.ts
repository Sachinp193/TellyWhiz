// server/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env for local development

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase connections from Vercel/Node.js to handle SSL certificates.
                              // 'rejectUnauthorized: false' is a common setting for development/testing,
                              // but for production, consider a more strict SSL configuration if Supabase provides CA certs.
  }
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(1); // Exit the process if there's an unrecoverable database error
});

console.log('Database pool initialized.');

export default pool;