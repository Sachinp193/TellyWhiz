// Step 1: Vitest imports ONLY
import { vi, describe, it, expect } from 'vitest';

// Step 2: Top-level log for file execution
console.log('[api.test.ts] File start - Before any vi.mock');

// Step 3: The vi.mock for '../tmdb' - Placed immediately after Vitest imports
vi.mock('../tmdb', () => {
  console.log('[Test Mock Factory ../tmdb] MINIMAL MOCK FACTORY EXECUTED IN API.TEST.TS'); // Critical log
  return {
    __esModule: true,
    tmdbClient: {
      searchShows: vi.fn((query: string) => {
        console.log('[Test Mock Factory ../tmdb] MOCKED tmdbClient.searchShows CALLED with:', query);
        return Promise.resolve([{ id: 999, name: "Minimal Mock Success" }]);
      }),
      // Mock all other methods exported by the original tmdbClient with basic vi.fn()
      getShowDetails: vi.fn(() => Promise.resolve(null)),
      getSeasons: vi.fn(() => Promise.resolve([])),
      getEpisodes: vi.fn(() => Promise.resolve([])),
      getCast: vi.fn(() => Promise.resolve([])),
      getPopularShowsFromTMDB: vi.fn(() => Promise.resolve([])),
      getRecentShowsFromTMDB: vi.fn(() => Promise.resolve([])),
      getTopRatedShowsFromTMDB: vi.fn(() => Promise.resolve([])),
      getGenresFromTMDB: vi.fn(() => Promise.resolve([])),
    }
  };
});

console.log('[api.test.ts] After vi.mock("../tmdb") declaration');

// Step 4: Import 'request' and 'app' AFTER vi.mock
import request from 'supertest';
// Conditional app import for safety, assuming app might log on import
let app: any; 
console.log('[api.test.ts] Importing app from ../index');
try {
  app = (await import('../index')).default; // Dynamically import to see if it helps with load order
  console.log('[api.test.ts] App imported successfully');
} catch (e) {
  console.error('[api.test.ts] Error importing app:', e);
  throw e; // Rethrow to fail fast if app import is the issue
}


// Step 5: Single describe block with one focused test
describe('Minimal TMDB Mock Test', () => {
  it('should use the minimal mocked searchShows and return 200', async () => {
    console.log('[api.test.ts] Running minimal test "should use the minimal mocked searchShows"...');
    if (!app) {
      throw new Error('App was not loaded');
    }
    try {
      const response = await request(app).get('/api/search?q=minimal');
      console.log('[api.test.ts] Minimal test response status:', response.status);
      console.log('[api.test.ts] Minimal test response body:', JSON.stringify(response.body));
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ id: 999, name: "Minimal Mock Success" }]);
    } catch (error) {
      console.error('[api.test.ts] Error during minimal test execution:', error);
      throw error;
    }
  });
});

console.log('[api.test.ts] File end');
