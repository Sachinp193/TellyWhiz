/// <reference types="vitest/globals" />
import request from 'supertest';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { SuperTest, Test, Response } from 'supertest';

// Define mocks for tvdbClient functions that are used by the routes in app
const mockApiSearchShows = vi.fn();
const mockApiGetShowDetails = vi.fn();
// Add mocks for any other tvdbClient functions used by routes being tested in this file
// For example, if your /api/shows/popular route (not tested here but as an example)
// directly calls tvdbClient.getPopularShows, you'd mock it.
// Based on the provided api.test.ts, only search and parts of track (which uses getShowDetails) are hit.

// Mock the new tvdb client from ../tvdb
// This assumes tvdb.ts exports these functions directly.
// routes.ts imports it as: import * as tvdbClient from './tvdb';
// So, the mock should reflect that structure if we were deeply mocking the module's behavior.
// However, for route testing, we often mock the specific functions called by the route handlers.
// The important part is that these mock functions (mockApiSearchShows, etc.) are called by your route handlers.
vi.mock('../tvdb.js', () => ({
  __esModule: true,
  // Ensure this matches the named exports from your actual ../tvdb.ts
  searchShows: mockApiSearchShows,
  getShowDetails: mockApiGetShowDetails,
  // Mock other functions from tvdb.ts if they are directly called by routes tested here
  getSeasons: vi.fn(),
  getEpisodes: vi.fn(),
  getCast: vi.fn(),
  getPopularShows: vi.fn(),
  getRecentShows: vi.fn(),
  getTopRatedShows: vi.fn(),
  getGenres: vi.fn(),
}));

// Simplified Axios Mock - This primarily affects how axios.create() behaves if called by the app itself
// or if other utility functions called by routes use axios directly.
// Given that tvdb.ts (and thus its internal axios instance) is mocked above,
// this axios mock here might be less critical unless app directly uses axios.
const mockAxiosInstanceForTestFile = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  defaults: { headers: { common: {} } },
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  },
};
const mockStaticAxiosGet = vi.fn();

vi.mock('axios', async () => {
  const actualAxios = await import('axios'); // For properties like isAxiosError
  return {
    default: {
      create: vi.fn(() => mockAxiosInstanceForTestFile),
      get: mockStaticAxiosGet,
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      isAxiosError: actualAxios.isAxiosError,
    },
    isAxiosError: actualAxios.isAxiosError,
  };
});

// Import app AFTER all vi.mock directives
import app from '../index.js'; // Using relative path
import { storage } from '../storage.js'; // Import real storage
import { db } from '../../db.js';
import * as schema from '../../shared/schema.js';
import { eq } from 'drizzle-orm';


// Helper functions
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
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset specific mock behaviors if needed for this suite, e.g.:
    // mockApiSearchShows.mockResolvedValue([]);
  });

  it('should return 200 and search results for a valid query', async () => {
    const mockRouteResponse = [
      { id: 1, name: 'Test Show 1', overview: 'Overview 1', image: 'image1.jpg', year: '2023' },
    ];
    mockApiSearchShows.mockResolvedValue(mockRouteResponse); // Mocking the behavior of tvdbClient.searchShows

    const response = await request(app).get('/api/search?q=ValidQuery');

    expect(mockApiSearchShows).toHaveBeenCalledWith('ValidQuery');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockRouteResponse);
  });

  it('should return 400 if the query is too short', async () => {
    const response = await request(app).get('/api/search?q=a');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Query must be at least 2 characters' });
    expect(mockApiSearchShows).not.toHaveBeenCalled();
  });

  it('should return 500 if tvdbClient.searchShows fails', async () => {
    mockApiSearchShows.mockRejectedValue(new Error('Internal TVDB Client Error'));
    const response = await request(app).get('/api/search?q=ErrorQuery');
    expect(response.status).toBe(500);
    expect(response.body.message).toEqual('Failed to search shows');
    expect(mockApiSearchShows).toHaveBeenCalledWith('ErrorQuery');
  });
});

describe('POST /api/user/shows/:id/track', () => {
  const testUser = { username: 'trackerUserApiTest', password: 'password123' };
  let userId: number | undefined;
  let authenticatedAgent: SuperTest<Test>;
  
  // This represents the data structure *after* tvdbClient.getShowDetails has transformed it
  const showDetailsFromTvdbClient = {
    tmdbId: 789, // This field name should match what storage.saveShow expects from the old structure if IDs are an issue
                // Or, ideally, it's just 'id' and it's the TVDB ID
    id: 789, // Assuming this is the TVDB ID
    name: "Test Show for Tracking",
    overview: "An overview.",
    status: "Running",
    firstAired: "2023-01-01",
    network: "Test Network",
    runtime: 30,
    image: "test_image.jpg",
    banner: "test_banner.jpg",
    rating: 8.0,
    genres: ["Drama"],
    year: "2023", // Or year range
  };

  beforeAll(async () => {
    // Ensure user is unique for this test suite run
    await db.delete(schema.users).where(eq(schema.users.username, testUser.username)); 
    await registerUser(testUser.username, testUser.password);
    authenticatedAgent = await loginUser(testUser.username, testUser.password);
    const user = await db.query.users.findFirst({ where: eq(schema.users.username, testUser.username) });
    if (user) { 
      userId = user.id; 
    } else {
      throw new Error("TRACKING TEST: Test user not found after registration/login in beforeAll.");
    }
  });

  beforeEach(() => {
    vi.resetAllMocks();
    // Mock the behavior of tvdbClient.getShowDetails
    mockApiGetShowDetails.mockImplementation(async (showIdFromRoute: number) => {
      if (showIdFromRoute === showDetailsFromTvdbClient.id) {
        return showDetailsFromTvdbClient;
      }
      return null;
    });
  });

  afterEach(async () => {
    // Clean up: Untrack show and remove from shows table if it was added
    if (userId) {
      // Find the show's internal DB ID first
      const showInDb = await db.query.shows.findFirst({ where: eq(schema.shows.id, showDetailsFromTvdbClient.id) }); // Assuming id is TVDB id
      if (showInDb) {
        await db.delete(schema.userShows).where(eq(schema.userShows.showId, showInDb.id)); // Use internal show ID
      }
    }
    await db.delete(schema.shows).where(eq(schema.shows.id, showDetailsFromTvdbClient.id)); // Assuming id is TVDB id
  });

  afterAll(async () => {
    if (userId) {
      await db.delete(schema.users).where(eq(schema.users.id, userId));
    }
  });

  it('should successfully track a new show for an authenticated user', async () => {
    if (!userId) { throw new Error("Test setup failed: userId not set."); }
    
    const response = await authenticatedAgent.post(`/api/user/shows/${showDetailsFromTvdbClient.id}/track`);
    
    expect(mockApiGetShowDetails).toHaveBeenCalledWith(showDetailsFromTvdbClient.id);
    expect(response.status).toBe(200); // Or 201, depending on your API's success response for this
    
    // Find the show in the 'shows' table to get its auto-incremented ID for the next assertion
    const showInDb = await db.query.shows.findFirst({ where: eq(schema.shows.id, showDetailsFromTvdbClient.id) }); // Assuming id is TVDB id
    expect(showInDb).toBeDefined();

    expect(response.body).toMatchObject({
      userId: userId,
      showId: showInDb!.id, // Use the actual ID from the shows table
      status: 'watching', // Default status when tracking
      favorite: false,    // Default favorite status
    });
  });

  it('should return 500 when trying to track an already tracked show (due to unique constraint or logic)', async () => {
    if (!userId) { throw new Error("Test setup failed: userId not set."); }
    
    // First track
    await authenticatedAgent.post(`/api/user/shows/${showDetailsFromTvdbClient.id}/track`);
    // Attempt to track again
    const response = await authenticatedAgent.post(`/api/user/shows/${showDetailsFromTvdbClient.id}/track`);
    
    expect(mockApiGetShowDetails).toHaveBeenCalledTimes(2); // getShowDetails is called each time to validate show
    expect(response.status).toBe(500); // Or 409 Conflict, or whatever your API returns
    expect((response.body as { message: string }).message).toContain('Failed to track show'); // Or a more specific message
  });

  it('should return 401 when trying to track a show without authentication', async () => {
    const response = await request(app).post(`/api/user/shows/${showDetailsFromTvdbClient.id}/track`);
    expect(response.status).toBe(401);
    expect((response.body as { message: string }).message).toBe('Unauthorized');
    expect(mockApiGetShowDetails).not.toHaveBeenCalled(); 
  });
});
