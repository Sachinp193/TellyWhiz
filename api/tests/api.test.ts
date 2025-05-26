/// <reference types="vitest/globals" />
import request from 'supertest';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import axios from 'axios'; // Import axios to spy on its methods after mocking

// Top-level mock function definitions for tmdbClient methods
const mockSearchShows = vi.fn();
const mockGetShowDetails = vi.fn();
const mockGetSeasons = vi.fn();
const mockGetEpisodes = vi.fn();
const mockGetCast = vi.fn();
const mockGetPopularShowsFromTMDB = vi.fn();
const mockGetRecentShowsFromTMDB = vi.fn();
const mockGetTopRatedShowsFromTMDB = vi.fn();
const mockGetGenresFromTMDB = vi.fn();

// Mock for '../tmdb' - known to have issues with factory execution for the app
vi.mock('../tmdb', () => {
  console.log('[Test Mock Factory ../tmdb] Attempting to execute factory for tmdbClient object literal.');
  return {
    __esModule: true,
    tmdbClient: {
      searchShows: mockSearchShows,
      getShowDetails: mockGetShowDetails,
      getSeasons: mockGetSeasons,
      getEpisodes: mockGetEpisodes,
      getCast: mockGetCast,
      getPopularShowsFromTMDB: mockGetPopularShowsFromTMDB,
      getRecentShowsFromTMDB: mockGetRecentShowsFromTMDB,
      getTopRatedShowsFromTMDB: mockGetTopRatedShowsFromTMDB,
      getGenresFromTMDB: mockGetGenresFromTMDB,
    }
  };
});

// Mock for 'axios'
vi.mock('axios', async (importOriginal) => {
  const actualAxios = await importOriginal<typeof import('axios')>();
  const mockGet = vi.fn();

  // Initial implementation (re-applied in beforeEach)
  mockGet.mockImplementation(async (url: string, config?: any) => {
    console.log(`[TEST MOCK AXIOS] Initial mockGet: URL: ${url}`);
    if (url === '/configuration') {
      const responseData = { data: {} }; // Fix for TypeError
      console.log('[TEST MOCK AXIOS] Initial mockGet: Returning for /configuration:', JSON.stringify(responseData));
      return Promise.resolve(responseData);
    }
    console.error(`[TEST MOCK AXIOS] Initial mockGet: Error: Attempted unmocked GET request to ${url}`);
    throw new Error(`[TEST MOCK AXIOS] Initial mockGet: Attempted unmocked GET request to ${url}`);
  });

  // This is the mock object that will be seen as the `axios` module's default export
  const mockAxiosModuleExports = {
    create: vi.fn((config) => {
      // Call the original actualAxios.create if it exists, otherwise mock a basic structure.
      // Note: actualAxios itself is the default export, so actualAxios.create is correct.
      const createdInstance = actualAxios.create ? actualAxios.create(config) : { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), defaults: { headers: {} } };
      return {
        ...createdInstance, // Spread real instance properties/methods
        get: mockGet,       // Override 'get' for the created instance to use our shared mock
        post: vi.fn(),      // Mock other methods for the instance as needed
        put: vi.fn(),
        delete: vi.fn(),
      };
    }),
    get: mockGet, // Static .get uses the shared mockGet
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    isAxiosError: actualAxios.isAxiosError, // Make sure isAxiosError is available
    // Include any other static properties/methods from actualAxios that might be used
    // For example: CancelToken: actualAxios.CancelToken, etc.
    // If not sure, it's safer to spread actualAxios properties that are not functions,
    // but be careful not to overwrite your mocks.
  };

  return {
    __esModule: true, // Indicate that this is an ES module mock
    default: mockAxiosModuleExports, // This is what `import axios from 'axios'` will receive
    // Optionally, make named exports available if your code uses them (e.g., import { isAxiosError } from 'axios')
    // For robust mocking, mirror the actual module structure.
    isAxiosError: actualAxios.isAxiosError, // Example if isAxiosError was also a named export
    // ... add other named exports if used ...
  };
});

// Import app AFTER all vi.mock directives
import app from '../index';
import { storage } from '../storage'; // Import real storage
import { db } from '../../db';
import * as schema from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { type SuperTest, type Test, type Response, type TestAgent } from 'supertest';

// Interface for mock show data (previously defined)
interface MockShow {
  id: number; name: string; overview: string; image: string; year: string;
  first_aired: string; network: string; status: string; runtime: number;
  banner: string; rating: number; genres: string[];
}

// Helper functions (previously defined)
const registerUser = async (username: string, password?: string): Promise<Response> => {
  return request(app).post('/api/auth/register').send({ username, password });
};

const loginUser = async (username: string, password?: string): Promise<TestAgent> => {
  const agent: TestAgent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password });
  return agent;
};

// Main test suites
describe('GET /api/search', () => {
  beforeEach(async () => {
    vi.resetAllMocks();

    // Re-apply axios.get mock implementation (with TypeError fix and logging)
    (axios.get as vi.Mock).mockImplementation(async (url: string, config?: any) => {
      console.log(`[TEST MOCK AXIOS] beforeEach GET /api/search: mockGet called with URL: ${url}`);
      if (url === '/configuration') {
        console.log('[TEST MOCK AXIOS] beforeEach GET /api/search: Returning for /configuration: {"data":{}}');
        return Promise.resolve({ data: {} }); // THE FIX FOR TypeError
      }
      console.error(`[TEST MOCK AXIOS] beforeEach GET /api/search: Error: Attempted unmocked GET request to ${url}`);
      throw new Error(`[TEST MOCK AXIOS] beforeEach GET /api/search: Attempted unmocked GET request to ${url}`);
    });

    // Default behaviors for tmdbClient mocks for this suite
    mockSearchShows.mockResolvedValue([]);
    mockGetShowDetails.mockResolvedValue(null);
    mockGetPopularShowsFromTMDB.mockResolvedValue([]);
    mockGetRecentShowsFromTMDB.mockResolvedValue([]);
    mockGetTopRatedShowsFromTMDB.mockResolvedValue([]);
    mockGetGenresFromTMDB.mockResolvedValue([]);
  });

  it('should return 200 and search results for a valid query', async () => {
    const mockApiShows = [
      { id: 1, name: 'Test Show 1', overview: 'Overview 1', image: 'image1.jpg', year: '2023', first_aired: '2023-01-01', network: 'Network1', status: 'Running', runtime: 30, banner: 'banner1.jpg', rating: 8, genres: ['Drama'] },
    ];
    mockSearchShows.mockResolvedValue(mockApiShows);
    const response = await request(app).get('/api/search?q=ValidQuery');
    expect(mockSearchShows).toHaveBeenCalledWith('ValidQuery'); 
    expect(response.status).toBe(200); 
    expect(response.body).toEqual(mockApiShows);
    expect(axios.get as vi.Mock).toHaveBeenCalledWith('/configuration');
  });

  it('should return 400 if the query is too short', async () => {
    const response = await request(app).get('/api/search?q=a');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Query must be at least 2 characters' });
    expect(mockSearchShows).not.toHaveBeenCalled();
    expect(axios.get as vi.Mock).not.toHaveBeenCalledWith('/configuration');
  });

  it('should return 500 if TMDB API call fails (simulated by tmdbClient.searchShows rejection)', async () => {
    mockSearchShows.mockRejectedValue(new Error('TMDB API Error'));
    const response = await request(app).get('/api/search?q=ErrorQuery');
    expect(response.status).toBe(500);
    expect(response.body.message).toEqual('Failed to search shows');
    expect(mockSearchShows).toHaveBeenCalledWith('ErrorQuery');
    expect(axios.get as vi.Mock).not.toHaveBeenCalledWith('/configuration');
  });
});

describe('POST /api/user/shows/:id/track', () => {
  const testUser = { username: 'trackerUser', password: 'password123' };
  let userId: number | undefined;
  let authenticatedAgent: SuperTest<Test>;
  type ShowInsertType = typeof schema.shows.$inferInsert;

  const showToTrack: ShowInsertType = {
    tmdbId: 123, name: "Test Show for Tracking", overview: "An overview.",
    status: "Running", firstAired: "2023-01-01", network: "Test Network",
    runtime: 30, image: "test_image.jpg", banner: "test_banner.jpg",
    rating: 8.0, genres: ["Drama"], year: "2023-Present",
  };

  beforeAll(async () => {
    await registerUser(testUser.username, testUser.password);
    authenticatedAgent = await loginUser(testUser.username, testUser.password);
    const user = await db.query.users.findFirst({ where: eq(schema.users.username, testUser.username) });
    if (user) { userId = user.id; } else { console.error("TRACKING TEST: Test user not found after registration/login in beforeAll."); }
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    (axios.get as vi.Mock).mockImplementation(async (url: string, config?: any) => {
      console.log(`[TEST MOCK AXIOS] beforeEach POST suite: mockGet called with URL: ${url}`);
      if (url === '/configuration') {
        console.log('[TEST MOCK AXIOS] beforeEach POST suite: Returning for /configuration: {"data":{}}');
        return Promise.resolve({ data: {} });
      }
      console.error(`[TEST MOCK AXIOS] beforeEach POST suite: Error: Attempted unmocked GET request to ${url}`);
      throw new Error(`[TEST MOCK AXIOS] beforeEach POST suite: Attempted unmocked GET request to ${url}`);
    });
    
    mockSearchShows.mockResolvedValue([]);
    mockGetSeasons.mockResolvedValue([]);
    mockGetEpisodes.mockResolvedValue([]);
    mockGetCast.mockResolvedValue([]);
    mockGetPopularShowsFromTMDB.mockResolvedValue([]);
    mockGetRecentShowsFromTMDB.mockResolvedValue([]);
    mockGetTopRatedShowsFromTMDB.mockResolvedValue([]);
    mockGetGenresFromTMDB.mockResolvedValue([]);
    
    mockGetShowDetails.mockImplementation(async (showIdFromRoute: number): Promise<any | null> => {
      if (showIdFromRoute === showToTrack.tmdbId) {
        console.log('[Test Mock] mockGetShowDetails providing data for tmdbId:', showToTrack.tmdbId);
        return { 
          id: showToTrack.tmdbId, name: showToTrack.name, overview: showToTrack.overview,
          status: showToTrack.status, first_air_date: showToTrack.firstAired,
          networks: [{ name: showToTrack.network }], episode_run_time: [showToTrack.runtime || 0],
          poster_path: showToTrack.image, backdrop_path: showToTrack.banner,
          vote_average: showToTrack.rating,
          genres: (showToTrack.genres || []).map(g => ({ name: g, id: Math.random() * 1000 })),
        };
      }
      return null;
    });
  });

  afterEach(async () => {
    if (userId) { await db.delete(schema.userShows).where(eq(schema.userShows.userId, userId)); }
    await db.delete(schema.shows).where(eq(schema.shows.tmdbId, showToTrack.tmdbId));
  });

  afterAll(async () => {
    if (userId) { await db.delete(schema.users).where(eq(schema.users.id, userId)); }
  });

  it('should successfully track a new show for an authenticated user', async () => {
    if (!userId) { console.warn("Skipping tracking test: userId not set."); return; }
    const response = await authenticatedAgent.post(`/api/user/shows/${showToTrack.tmdbId}/track`);
    expect(mockGetShowDetails).toHaveBeenCalledWith(showToTrack.tmdbId);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      userId: userId, showId: expect.any(Number), status: 'watching', favorite: false,
    });
    const dbShow = await db.query.shows.findFirst({ where: eq(schema.shows.tmdbId, showToTrack.tmdbId) });
    expect(dbShow).toBeDefined();
  });

  it('should return 500 when trying to track an already tracked show (due to unique constraint)', async () => {
    if (!userId) { console.warn("Skipping re-tracking test: userId not set."); return; }
    await authenticatedAgent.post(`/api/user/shows/${showToTrack.tmdbId}/track`);
    const response = await authenticatedAgent.post(`/api/user/shows/${showToTrack.tmdbId}/track`);
    expect(mockGetShowDetails).toHaveBeenCalledTimes(2); 
    expect(response.status).toBe(500); 
    expect((response.body as { message: string }).message).toContain('Failed to track show');
  });

  it('should return 401 when trying to track a show without authentication', async () => {
    const response = await request(app).post(`/api/user/shows/${showToTrack.tmdbId}/track`);
    expect(response.status).toBe(401);
    expect((response.body as { message: string }).message).toBe('Unauthorized');
    expect(mockGetShowDetails).not.toHaveBeenCalled(); 
  });
});
