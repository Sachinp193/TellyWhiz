import * as schema from '@shared/schema.js'; // Changed to alias
import { drizzle as drizzleNeonOriginal, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { Pool as NeonPoolOriginal, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzlePg, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool as PgPool } from 'pg';
import ws from "ws"; // Required for neon serverless over WebSocket

let db: NeonHttpDatabase<typeof schema> | NodePgDatabase<typeof schema>;
// export let poolInstance: NeonPoolOriginal | PgPool; // Export pool if needed elsewhere, ensure type compatibility

if (process.env.NODE_ENV === 'test') {
  console.log('[db/index.ts] Using pg driver for test environment. DATABASE_URL:', process.env.DATABASE_URL);
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL for test environment is not set or invalid. Expected format: postgresql://user:password@host:port/database. Received: ' + process.env.DATABASE_URL);
  }
  const pgPool = new PgPool({
    connectionString: process.env.DATABASE_URL,
  });
  // poolInstance = pgPool;
  db = drizzlePg(pgPool, { schema });
} else {
  console.log('[db/index.ts] Using neon driver for non-test environment. DATABASE_URL:', process.env.DATABASE_URL);
  if (!process.env.DATABASE_URL) { 
    throw new Error('DATABASE_URL for neon environment is not set.');
  }
  // This is the correct way neon config - DO NOT change this
  neonConfig.webSocketConstructor = ws;
  const neonPool = new NeonPoolOriginal({ connectionString: process.env.DATABASE_URL });
  // poolInstance = neonPool;
  // Note: The original code used drizzle from 'drizzle-orm/neon-serverless'.
  // The instructions provided drizzleNeon from 'drizzle-orm/neon-http'.
  // Using neon-http as per instructions, but if issues arise, neon-serverless might be the intended one for NeonPool.
  // For now, sticking to the provided instructions.
  // However, NeonPool from @neondatabase/serverless is typically used with drizzle from drizzle-orm/neon-serverless.
  // Let's try to match the original import for neon drizzle if NeonPool is from @neondatabase/serverless
  const { drizzle: drizzleNeonServerless } = await import('drizzle-orm/neon-serverless');
  db = drizzleNeonServerless(neonPool, { schema });
}

export { db };
// export const pool = poolInstance; // If pool needs to be exported