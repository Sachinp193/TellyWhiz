// server/tests/setupTests.ts
import dotenv from 'dotenv';
import path from 'path';

// Load .env.test file if it exists, otherwise set a default
// This ensures DATABASE_URL is set before any module that needs it is imported.
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://testuser:testpass@localhost:5432/testdb';
  console.log('DATABASE_URL not found in .env.test, using default for testing.');
}

// You can also set other environment variables needed for tests here
process.env.TMDB_API_KEY = 'test_tmdb_api_key';
process.env.SESSION_SECRET = 'test_session_secret';
