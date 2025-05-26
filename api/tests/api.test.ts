import request from 'supertest';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import axios from 'axios'; // Import axios to spy on its methods after mocking

vi.mock('axios', async (importOriginal) => {
  const actualAxios = await importOriginal<typeof import('axios')>();
  const mockGet = vi.fn(); // This is THE mock function shared by static and instance .get

  // Initial implementation (will be reset by resetAllMocks, so needs re-applying in beforeEach)
  mockGet.mockImplementation(async (url: string, config?: any) => {
    console.log(`[TEST MOCK AXIOS] mockGet initially called with URL: ${url}`);
    if (url === '/configuration') {
      const responseData = { data: { images: { secure_base_url: "https://image.tmdb.org/t/p/", poster_sizes: ["w342", "original"], backdrop_sizes: ["w780", "original"], profile_sizes: ["w185", "original"], still_sizes: ["w300", "original"] } } };
      console.log('[TEST MOCK AXIOS] Initial mock: Returning for /configuration:', JSON.stringify(responseData));
      return Promise.resolve(responseData);
    }
    console.error(`[TEST MOCK AXIOS] Initial mock: Error: Attempted unmocked GET request to ${url}`);
    throw new Error(`[TEST MOCK AXIOS] Initial mock: Attempted unmocked GET request to ${url}`);
  });

  return {
    ...actualAxios, // Spread original axios to keep non-mocked parts like AxiosError
    default: { // Mock the default export (axios itself)
      ...actualAxios.default, // Spread original axios default export
      create: vi.fn(() => ({ // Mock axios.create()
        ...(actualAxios.default ? actualAxios.default.create() : {}), // Spread an actual instance if needed for other methods
        get: mockGet, // Use the mockGet function for instance.get()
        post: vi.fn(), // Add other methods if used by tmdb.ts and need mocking
        put: vi.fn(),
        delete: vi.fn(),
      })),
      get: mockGet, // Also mock static axios.get() if used directly by tmdb.ts
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      isAxiosError: actualAxios.isAxiosError // Ensure this is correctly passed through
    },
  };
});

import app from '../index'; 
import { tmdbClient as tmdbMockObject } from '../tmdb'; 
import { storage } from '../storage'; // Import real storage
import { db } from '../../db'; 
import * as schema from '../../shared/schema'; 
import { eq, sql } from 'drizzle-orm';

// Mock the tmdb module, specifically the tmdbClient object and its methods
vi.mock('../tmdb', () => ({
  tmdbClient: {
    searchShows: vi.fn(),
    getShowDetails: vi.fn(),
    getSeasons: vi.fn(),
    getEpisodes: vi.fn(),
    getCast: vi.fn(),
    getPopularShowsFromTMDB: vi.fn(),
    getRecentShowsFromTMDB: vi.fn(),
    getTopRatedShowsFromTMDB: vi.fn(),
    getGenresFromTMDB: vi.fn(),
  }
}));

import { type SuperTest, type Test, type Response } from 'supertest';

// Define a type for the show objects based on usage, can be refined with actual schema
interface MockShow {
  id: number;
  name: string;
  overview: string;
  image: string;
  year: string;
  first_aired: string; // Assuming this matches the mock data, adjust if API expects different
  network: string;
  status: string;
  runtime: number;
  banner: string;
  rating: number;
  genres: string[];
}

// Helper function to register a user
const registerUser = async (username: string, password?: string): Promise<Response> => {
  return request(app).post('/api/auth/register').send({ username, password });
};

// Helper function to login a user and return an authenticated agent
const loginUser = async (username: string, password?: string): Promise<SuperTest<Test>> => {
  const agent: SuperTest<Test> = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password });
  return agent;
};


describe('GET /api/search', () => {
  beforeEach(async () => {
    // Reset ALL mocks before each test. 
    vi.resetAllMocks();

    // Re-apply the implementation for the shared mockGet (accessed via static axios.get)
    // This is crucial because vi.resetAllMocks() clears the previous implementation.
    (axios.get as vi.Mock).mockImplementation(async (url: string, config?: any) => {
      console.log(`[TEST MOCK AXIOS] beforeEach mockGet called with URL: ${url}`);
      if (url === '/configuration') {
        const responseData = { data: { images: { secure_base_url: "https://image.tmdb.org/t/p/", poster_sizes: ["w342", "original"], backdrop_sizes: ["w780", "original"], profile_sizes: ["w185", "original"], still_sizes: ["w300", "original"] } } };
        console.log('[TEST MOCK AXIOS] beforeEach: Returning for /configuration:', JSON.stringify(responseData));
        return Promise.resolve(responseData);
      }
      console.error(`[TEST MOCK AXIOS] beforeEach: Error: Attempted unmocked GET request to ${url}`);
      throw new Error(`[TEST MOCK AXIOS] beforeEach: Attempted unmocked GET request to ${url}`);
    });

    // Default mock implementations for tmdbClient methods (tmdbMockObject)
    (tmdbMockObject.searchShows as vi.Mock<[string], Promise<MockShow[]>>).mockResolvedValue([]);
    (tmdbMockObject.getShowDetails as vi.Mock<[number], Promise<any>>).mockResolvedValue(null);
    (tmdbMockObject.getSeasons as vi.Mock<[number], Promise<any[]>>).mockResolvedValue([]);
    (tmdbMockObject.getEpisodes as vi.Mock<[number, number], Promise<any[]>>).mockResolvedValue([]);
    (tmdbMockObject.getCast as vi.Mock<[number], Promise<any[]>>).mockResolvedValue([]);
    (tmdbMockObject.getPopularShowsFromTMDB as vi.Mock<[], Promise<MockShow[]>>).mockResolvedValue([]);
    (tmdbMockObject.getRecentShowsFromTMDB as vi.Mock<[], Promise<MockShow[]>>).mockResolvedValue([]);
    (tmdbMockObject.getTopRatedShowsFromTMDB as vi.Mock<[], Promise<MockShow[]>>).mockResolvedValue([]);
    (tmdbMockObject.getGenresFromTMDB as vi.Mock<[], Promise<any[]>>).mockResolvedValue([]);
  });


  it('should return 200 and search results for a valid query', async () => {
    const mockShows: MockShow[] = [
      { id: 1, name: 'Test Show 1', overview: 'Overview 1', image: 'image1.jpg', year: '2023', first_aired: '2023-01-01', network: 'Network1', status: 'Running', runtime: 30, banner: 'banner1.jpg', rating: 8, genres: ['Drama'] },
      { id: 2, name: 'Test Show 2', overview: 'Overview 2', image: 'image2.jpg', year: '2022', first_aired: '2022-01-01', network: 'Network2', status: 'Ended', runtime: 60, banner: 'banner2.jpg', rating: 9, genres: ['Comedy'] },
    ];
    // This mock is for tmdbClient.searchShows, which is called by the /api/search route handler
    (tmdbMockObject.searchShows as vi.Mock<[string], Promise<MockShow[]>>).mockResolvedValue(mockShows);

    const response: Response = await request(app).get('/api/search?q=ValidQuery');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockShows);

    // Assert that the shared mockGet (via axios.get) was called for /configuration
    expect(axios.get as vi.Mock).toHaveBeenCalledWith('/configuration');
    
    // Verify that the tmdbClient.searchShows (which is tmdbMockObject.searchShows here) was called
    expect(tmdbMockObject.searchShows).toHaveBeenCalledWith('ValidQuery');
  });

  it('should return 400 if the query is too short', async () => {
    const response: Response = await request(app).get('/api/search?q=a');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Query must be at least 2 characters' });
    expect(tmdbMockObject.searchShows).not.toHaveBeenCalled();
    
    // Configuration should still be called by the app's middleware/setup.
    expect(axios.get as vi.Mock).toHaveBeenCalledWith('/configuration');
  });

  it('should return 500 if TMDB API call fails (simulated by tmdbClient.searchShows rejection)', async () => {
    // Simulate failure at the level of tmdbClient.searchShows
    (tmdbMockObject.searchShows as vi.Mock<[string], Promise<MockShow[]>>).mockRejectedValue(new Error('TMDB API Error'));

    const response: Response = await request(app).get('/api/search?q=ErrorQuery');

    expect(response.status).toBe(500);
    expect((response.body as { message: string }).message).toEqual('Failed to search shows');

    // Configuration should have been called
    expect(axios.get as vi.Mock).toHaveBeenCalledWith('/configuration');
    
    // tmdbClient.searchShows should have been called
    expect(tmdbMockObject.searchShows).toHaveBeenCalledWith('ErrorQuery');
  });
});

describe('POST /api/user/shows/:id/track', () => {
  const testUser = {
    username: 'trackerUser',
    password: 'password123',
  };
  let userId: number | undefined;
  let authenticatedAgent: SuperTest<Test>;

  // Assuming schema.ShowInsert has these properties. Adjust as per actual schema.
  // This type should ideally be imported from your schema definitions.
  type ShowInsertType = typeof schema.shows.$inferInsert;

  const showToTrack: ShowInsertType = {
    // id is auto-generated by DB, so not included here for insertion
    tmdbId: 123, 
    name: "Test Show for Tracking",
    overview: "An overview.",
    status: "Running", // Ensure this matches schema enum if applicable
    firstAired: "2023-01-01",
    network: "Test Network",
    runtime: 30,
    image: "test_image.jpg",
    banner: "test_banner.jpg",
    rating: 8.0, // Make sure this is a number if schema expects float/decimal
    genres: ["Drama"], // Ensure this matches schema (e.g., JSON or separate table)
    year: "2023-Present", // This might need to be an integer or derived differently
    // lastRefreshed: new Date(), // Example: if your schema requires it
    // Add other required fields from schema.shows.$inferInsert
  };


  beforeAll(async () => {
    await registerUser(testUser.username, testUser.password);
    authenticatedAgent = await loginUser(testUser.username, testUser.password);
    const user = await db.query.users.findFirst({ where: eq(schema.users.username, testUser.username) });
    if (user) {
      userId = user.id;
    } else {
      throw new Error("Test user not found after registration and login.");
    }
  });

  beforeEach(async () => {
    // Reset ALL mocks. This includes the mockGet in the axios factory.
    vi.resetAllMocks();

    // Re-apply the default mock implementation for axios.get (shared mockGet) for this suite too.
    (axios.get as vi.Mock).mockImplementation(async (url: string) => {
      if (url === '/configuration') {
        return Promise.resolve({ 
          data: { 
            images: { 
              secure_base_url: 'https://image.tmdb.org/t/p/',
              poster_sizes: ["w92", "w154", "w185", "w342", "w500", "w780", "original"],
              backdrop_sizes: ["w300", "w780", "w1280", "original"],
              profile_sizes: ["w45", "w185", "h632", "original"],
              still_sizes: ["w92", "w185", "w300", "original"]
            } 
          } 
        });
      }
      // Add specific mocks for other URLs if needed by this test suite's axios calls,
      // or throw an error for unexpected calls.
      throw new Error(`[TEST MOCK] Axios: Attempted unmocked GET request to ${url} during POST suite test run`);
    });

    // Default mocks for tmdbClient methods relevant to this suite
    (tmdbMockObject.searchShows as vi.Mock).mockResolvedValue([]); 
    (tmdbMockObject.getSeasons as vi.Mock).mockResolvedValue([]);   
    
    // The route handler for tracking calls `storage.getShowDetails(tmdbId)`.
    // `storage.getShowDetails` internally calls `tmdbClient.getShowDetails(tmdbId)` (which is tmdbMockObject.getShowDetails)
    // and then `storage.saveShow()`.
    // So we mock `tmdbMockObject.getShowDetails` to return the necessary TMDB-like data.
    (tmdbMockObject.getShowDetails as vi.Mock).mockImplementation(async (showIdFromRoute: number): Promise<Partial<schema.Show> | null> => {
      if (showIdFromRoute === showToTrack.tmdbId) {
        // This is the data that tmdbClient.getShowDetails would return from TMDB API
        // storage.saveShow will then use this to save to the DB.
        return {
          name: showToTrack.name,
          overview: showToTrack.overview,
          first_air_date: showToTrack.firstAired,
          networks: [{ name: showToTrack.network }],
          episode_run_time: [showToTrack.runtime || 0], 
          poster_path: showToTrack.image,
          backdrop_path: showToTrack.banner,
          vote_average: showToTrack.rating,
          genres: showToTrack.genres.map(g => ({ name: g })),
          status: showToTrack.status,
        } as any; 
      }
      return null;
    });
  });

  afterEach(async () => {
    if (userId) {
      await db.delete(schema.userShows).where(eq(schema.userShows.userId, userId));
    }
    await db.delete(schema.shows).where(eq(schema.shows.tmdbId, showToTrack.tmdbId));
  });

  afterAll(async () => {
    if (userId) {
      await db.delete(schema.users).where(eq(schema.users.id, userId));
    }
  });

  it('should successfully track a new show for an authenticated user', async () => {
    if (!userId) throw new Error("User ID not set for test");

    const response: Response = await authenticatedAgent
      .post(`/api/user/shows/${showToTrack.tmdbId}/track`);

    expect(response.status).toBe(200); 
    // Assuming response.body for successful tracking aligns with this structure
    expect(response.body).toMatchObject({
      userId: userId,
      showId: expect.any(Number), 
      status: 'watching',
      favorite: false,
    });

    const dbShow = await db.query.shows.findFirst({
      where: eq(schema.shows.tmdbId, showToTrack.tmdbId),
    });
    expect(dbShow).toBeDefined();
    if (!dbShow) throw new Error("Show not found in DB after tracking"); // Type guard
    expect(dbShow.name).toBe(showToTrack.name);

    const dbUserShow = await db.query.userShows.findFirst({
      // Ensure userId is defined for this query
      where: eq(schema.userShows.userId, userId) && eq(schema.userShows.showId, dbShow.id),
    });
    expect(dbUserShow).toBeDefined();
    expect(dbUserShow?.status).toBe('watching');
  });

  it('should return 500 when trying to track an already tracked show (due to unique constraint)', async () => {
    if (!userId) throw new Error("User ID not set for test");
    // First, track the show
    await authenticatedAgent.post(`/api/user/shows/${showToTrack.tmdbId}/track`);

    // Then, attempt to track it again
    const response: Response = await authenticatedAgent
      .post(`/api/user/shows/${showToTrack.tmdbId}/track`);
    
    expect(response.status).toBe(500); 
    // Assuming the error response body has a 'message' property of type string
    expect((response.body as { message: string }).message).toContain('Failed to track show');

    const dbShow = await db.query.shows.findFirst({ where: eq(schema.shows.tmdbId, showToTrack.tmdbId) });
    if (!dbShow) throw new Error("Show not found after tracking for count assertion");
    
    const userShowsCountResult = await db.select({ count: sql<number>`count(*)` }).from(schema.userShows)
      .where(eq(schema.userShows.userId, userId) && eq(schema.userShows.showId, dbShow.id));
    expect(userShowsCountResult[0].count).toBe(1);
  });

  it('should return 401 when trying to track a show without authentication', async () => {
    const response: Response = await request(app) 
      .post(`/api/user/shows/${showToTrack.tmdbId}/track`);

    expect(response.status).toBe(401);
    // Assuming the error response body has a 'message' property of type string
    expect((response.body as { message: string }).message).toBe('Unauthorized');
  });
});
