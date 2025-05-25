// server/tests/setupTests.ts
import dotenv from 'dotenv';
import path from 'path';

// Load .env.test file if it exists from the project root.
const projectRootEnvTestPath = path.join(__dirname, '..', '..', '.env.test');
console.log(`[setupTests.ts] Attempting to load .env.test from: ${projectRootEnvTestPath}`);
const result = dotenv.config({ path: projectRootEnvTestPath });

if (result.error) {
  console.error('[setupTests.ts] Error loading .env.test:', result.error);
} else if (!result.parsed || !result.parsed.DATABASE_URL) {
  console.error('[setupTests.ts] CRITICAL: DATABASE_URL not found in the loaded .env.test file or file is empty. Path:', projectRootEnvTestPath);
} else {
  console.log('[setupTests.ts] DATABASE_URL loaded successfully from .env.test:', process.env.DATABASE_URL); // process.env.DATABASE_URL should be set by dotenv
}

// You can also set other environment variables needed for tests here
process.env.TMDB_API_KEY = 'test_tmdb_api_key';
process.env.SESSION_SECRET = 'test_session_secret';
