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
const mockGetPopularShowsFromTVDB = vi.fn(); // Renamed
const mockGetRecentShowsFromTVDB = vi.fn(); // Renamed
const mockGetTopRatedShowsFromTVDB = vi.fn(); // Renamed
const mockGetGenresFromTVDB = vi.fn(); // Renamed

// Mock for '../tvdb'
vi.mock('@api/tvdb.js', () => { // Changed to alias
  // console.log('[Test Mock Factory ../tvdb] Attempting to execute factory for tvdbClient object literal.');
  return {
    __esModule: true,
    // The tvdb.ts file exports individual functions, so we mock them directly here.
    // This structure is correct because routes.ts imports like: import * as tvdbClient from './tvdb';
    // and then calls tvdbClient.searchShows, etc.
    searchShows: mockSearchShows,
    getShowDetails: mockGetShowDetails,
    getSeasons: mockGetSeasons,
    getEpisodes: mockGetEpisodes,
    getCast: mockGetCast,
    getPopularShows: mockGetPopularShowsFromTVDB, // Renamed
    getRecentShows: mockGetRecentShowsFromTVDB, // Renamed
    getTopRatedShows: mockGetTopRatedShowsFromTVDB, // Renamed
    getGenres: mockGetGenresFromTVDB, // Renamed
  };
});

// Define a shared mock for the axios instance methods if needed by tests
const mockAxiosInstanceForTestFile = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  // Add other methods if your tests expect them on an instance
};

// Define a shared mock for static axios methods if needed
const mockStaticAxiosGet = vi.fn();
// Define other static mocks if needed (post, etc.)

vi.mock('axios', async () => {
  // Dynamically import the original axios to get non-function properties like isAxiosError
  const actualAxios = await import('axios'); 
  return {
    default: {
      create: vi.fn((config?: any) => ({
        ...mockAxiosInstanceForTestFile, // Spread your instance mock methods
        defaults: { headers: { common: {} }, ...config }, // Mimic some defaults structure
        interceptors: { // Mimic interceptors structure
          request: { use: vi.fn(), eject: vi.fn() },
          response: { use: vi.fn(), eject: vi.fn() },
        },
      })),
      get: mockStaticAxiosGet, // Mock for static axios.get(...)
      post: vi.fn(), // Mock for static axios.post(...)
      // Add other static methods if used
      isAxiosError: actualAxios.isAxiosError, // Use the actual isAxiosError
    },
    isAxiosError: actualAxios.isAxiosError, // Also export it named if used like: import { isAxiosError } from 'axios'
    // Add other named exports if your code uses them
  };
});

// Import app AFTER all vi.mock directives
import app from '@api/index.js'; // Changed to alias
import { storage } from '@api/storage.js'; // Changed to alias
import { db } from '@db/index.js'; // Changed to alias
import * as schema from '@shared/schema.js'; // Changed to alias
import { eq, sql } from 'drizzle-orm';
import { type SuperTest, type Test, type Response } from 'supertest';

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

const loginUser = async (username: string, password?: string): Promise<SuperTest<Test>> => {
  const agent: SuperTest<Test> = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password });
  return agent;
};

// Main test suites
describe('GET /api/search', () => {
  beforeEach(async () => {
    vi.resetAllMocks();

    // Reset mocks for axios instance and static calls
    mockAxiosInstanceForTestFile.get.mockReset(); // Adjusted to new mock instance name
    mockAxiosInstanceForTestFile.post.mockReset();
    mockStaticAxiosGet.mockReset();


    // Default behaviors for tvdbClient mocks for this suite
    mockSearchShows.mockResolvedValue([]);
    mockGetShowDetails.mockResolvedValue(null);
    // These should align with the new naming in the tvdbClient mock if they were changed
    // (e.g., getPopularShows vs getPopularShowsFromTVDB)
    mockGetPopularShowsFromTVDB.mockResolvedValue([]); 
    mockGetRecentShowsFromTVDB.mockResolvedValue([]);
    mockGetTopRatedShowsFromTVDB.mockResolvedValue([]);
    mockGetGenresFromTVDB.mockResolvedValue([]);
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
    // No longer expecting axios.get to be called with /configuration from these specific tests
    // as tvdbClient is fully mocked.
  });

  it('should return 400 if the query is too short', async () => {
    const response = await request(app).get('/api/search?q=a');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Query must be at least 2 characters' });
    expect(mockSearchShows).not.toHaveBeenCalled();
  });

  it('should return 500 if TVDB API call fails (simulated by tvdbClient.searchShows rejection)', async () => {
    mockSearchShows.mockRejectedValue(new Error('TVDB API Error')); // Renamed Error
    const response = await request(app).get('/api/search?q=ErrorQuery');
    expect(response.status).toBe(500);
    expect(response.body.message).toEqual('Failed to search shows');
    expect(mockSearchShows).toHaveBeenCalledWith('ErrorQuery');
  });
});

describe('POST /api/user/shows/:id/track', () => {
  const testUser = { username: 'trackerUser', password: 'password123' };
  let userId: number | undefined;
  let authenticatedAgent: SuperTest<Test>;
  type ShowInsertType = typeof schema.shows.$inferInsert;

  const showToTrack: ShowInsertType = {
    tvdbId: 123, name: "Test Show for Tracking", overview: "An overview.",
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
    // Reset mocks for axios instance and static calls
    mockAxiosInstanceForTestFile.get.mockReset(); // Adjusted
    mockAxiosInstanceForTestFile.post.mockReset();
    mockStaticAxiosGet.mockReset();

    mockSearchShows.mockResolvedValue([]);
    mockGetSeasons.mockResolvedValue([]);
    mockGetEpisodes.mockResolvedValue([]);
    mockGetCast.mockResolvedValue([]);
    mockGetPopularShowsFromTVDB.mockResolvedValue([]); // Renamed
    mockGetRecentShowsFromTVDB.mockResolvedValue([]); // Renamed
    mockGetTopRatedShowsFromTVDB.mockResolvedValue([]); // Renamed
    mockGetGenresFromTVDB.mockResolvedValue([]); // Renamed
    
    mockGetShowDetails.mockImplementation(async (showIdFromRoute: number): Promise<any | null> => {
      if (showIdFromRoute === showToTrack.tvdbId) {
        console.log('[Test Mock] mockGetShowDetails providing data for tvdbId:', showToTrack.tvdbId);
        return { 
          id: showToTrack.tvdbId, name: showToTrack.name, overview: showToTrack.overview,
          status: showToTrack.status, first_air_date: showToTrack.firstAired,
          networks: [{ name: showToTrack.network }], episode_run_time: [showToTrack.runtime || 0],
          poster_path: showToTrack.image, backdrop_path: showToTrack.banner,
          vote_average: showToTrack.rating,
          genres: (showToTrack.genres || []).map((g: any) => ({ name: g, id: Math.random() * 1000 })),
        };
      }
      return null;
    });
  });

  afterEach(async () => {
    if (userId) { await db.delete(schema.userShows).where(eq(schema.userShows.userId, userId)); }
    await db.delete(schema.shows).where(eq(schema.shows.tvdbId, showToTrack.tvdbId));
  });

  afterAll(async () => {
    if (userId) { await db.delete(schema.users).where(eq(schema.users.id, userId)); }
  });

  it('should successfully track a new show for an authenticated user', async () => {
    if (!userId) { console.warn("Skipping tracking test: userId not set."); return; }
    const response = await authenticatedAgent.post(`/api/user/shows/${showToTrack.tvdbId}/track`);
    expect(mockGetShowDetails).toHaveBeenCalledWith(showToTrack.tvdbId);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      userId: userId, showId: expect.any(Number), status: 'watching', favorite: false,
    });
    const dbShow = await db.query.shows.findFirst({ where: eq(schema.shows.tvdbId, showToTrack.tvdbId) });
    expect(dbShow).toBeDefined();
  });

  it('should return 500 when trying to track an already tracked show (due to unique constraint)', async () => {
    if (!userId) { console.warn("Skipping re-tracking test: userId not set."); return; }
    await authenticatedAgent.post(`/api/user/shows/${showToTrack.tvdbId}/track`);
    const response = await authenticatedAgent.post(`/api/user/shows/${showToTrack.tvdbId}/track`);
    expect(mockGetShowDetails).toHaveBeenCalledTimes(2); 
    expect(response.status).toBe(500); 
    expect((response.body as { message: string }).message).toContain('Failed to track show');
  });

  it('should return 401 when trying to track a show without authentication', async () => {
    const response = await request(app).post(`/api/user/shows/${showToTrack.tvdbId}/track`);
    expect(response.status).toBe(401);
    expect((response.body as { message: string }).message).toBe('Unauthorized');
    expect(mockGetShowDetails).not.toHaveBeenCalled(); 
  });
});
