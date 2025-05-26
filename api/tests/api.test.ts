import request from 'supertest';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import axios from 'axios'; // Import axios to spy on its methods after mocking

const mockSearchShows = vi.fn();
const mockGetShowDetails = vi.fn();
const mockGetSeasons = vi.fn();
const mockGetEpisodes = vi.fn();
const mockGetCast = vi.fn();
const mockGetPopularShowsFromTMDB = vi.fn();
const mockGetRecentShowsFromTMDB = vi.fn();
const mockGetTopRatedShowsFromTMDB = vi.fn();
const mockGetGenresFromTMDB = vi.fn();

vi.mock('../tmdb', () => ({
  __esModule: true, // Important for ES Modules
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
}));

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
    ...actualAxios, 
    default: { 
      ...actualAxios.default, 
      create: vi.fn(() => ({ 
        ...(actualAxios.default ? actualAxios.default.create() : {}), 
        get: mockGet, 
        post: vi.fn(), 
        put: vi.fn(),
        delete: vi.fn(),
      })),
      get: mockGet, 
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      isAxiosError: actualAxios.isAxiosError 
    },
  };
});

import app from '../index'; 
import { storage } from '../storage'; 
import { db } from '../../db'; 
import * as schema from '../../shared/schema'; 
import { eq, sql } from 'drizzle-orm';


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
    (axios.get as vi.Mock).mockImplementation(async (url: string, config?: any) => {
      console.log(`[TEST MOCK AXIOS] beforeEach GET /api/search mockGet called with URL: ${url}`);
      if (url === '/configuration') {
        console.log('[TEST MOCK AXIOS] beforeEach mockGet. Returning for /configuration: {"data":{}}'); // Updated log
        return Promise.resolve({ data: {} }); // Changed to minimal data object
      }
      console.error(`[TEST MOCK AXIOS] beforeEach GET /api/search: Error: Attempted unmocked GET request to ${url}`);
      throw new Error(`[TEST MOCK AXIOS] beforeEach GET /api/search: Attempted unmocked GET request to ${url}`);
    });

    // Default mock implementations for new tmdbClient mock functions
    mockSearchShows.mockResolvedValue([]);
    mockGetShowDetails.mockResolvedValue(null); 
    mockGetSeasons.mockResolvedValue([]);     
    mockGetEpisodes.mockResolvedValue([]);    
    mockGetCast.mockResolvedValue([]);        
    mockGetPopularShowsFromTMDB.mockResolvedValue([]);
    mockGetRecentShowsFromTMDB.mockResolvedValue([]);
    mockGetTopRatedShowsFromTMDB.mockResolvedValue([]);
    mockGetGenresFromTMDB.mockResolvedValue([]);
  });


  it('should return 200 and search results for a valid query', async () => {
    const mockShowsData: MockShow[] = [ // Renamed to avoid conflict with interface name
      { id: 1, name: 'Test Show 1', overview: 'Overview 1', image: 'image1.jpg', year: '2023', first_aired: '2023-01-01', network: 'Network1', status: 'Running', runtime: 30, banner: 'banner1.jpg', rating: 8, genres: ['Drama'] },
      { id: 2, name: 'Test Show 2', overview: 'Overview 2', image: 'image2.jpg', year: '2022', first_aired: '2022-01-01', network: 'Network2', status: 'Ended', runtime: 60, banner: 'banner2.jpg', rating: 9, genres: ['Comedy'] },
    ];
    mockSearchShows.mockResolvedValue(mockShowsData);

    const response: Response = await request(app).get('/api/search?q=ValidQuery');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockShowsData);

    expect(axios.get as vi.Mock).toHaveBeenCalledWith('/configuration');
    expect(mockSearchShows).toHaveBeenCalledWith('ValidQuery');
  });

  it('should return 400 if the query is too short', async () => {
    const response: Response = await request(app).get('/api/search?q=a');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Query must be at least 2 characters' });
    expect(mockSearchShows).not.toHaveBeenCalled();
    expect(axios.get as vi.Mock).not.toHaveBeenCalledWith('/configuration');
  });

  it('should return 500 if TMDB API call fails (simulated by tmdbClient.searchShows rejection)', async () => {
    mockSearchShows.mockRejectedValue(new Error('TMDB API Error'));

    const response: Response = await request(app).get('/api/search?q=ErrorQuery');

    expect(response.status).toBe(500);
    expect((response.body as { message: string }).message).toEqual('Failed to search shows');
    
    expect(axios.get as vi.Mock).not.toHaveBeenCalledWith('/configuration');
    expect(mockSearchShows).toHaveBeenCalledWith('ErrorQuery');
  });
});

describe('POST /api/user/shows/:id/track', () => {
  const testUser = {
    username: 'trackerUser',
    password: 'password123',
  };
  let userId: number | undefined;
  let authenticatedAgent: SuperTest<Test>;

  type ShowInsertType = typeof schema.shows.$inferInsert;

  const showToTrack: ShowInsertType = {
    tmdbId: 123, 
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
    year: "2023-Present", 
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
    vi.resetAllMocks();

    (axios.get as vi.Mock).mockImplementation(async (url: string, config?: any) => {
      console.log(`[TEST MOCK AXIOS] beforeEach POST suite mockGet called with URL: ${url}`);
      if (url === '/configuration') {
        console.log('[TEST MOCK AXIOS] beforeEach mockGet. Returning for /configuration: {"data":{}}'); // Updated log
        return Promise.resolve({ data: {} }); // Changed to minimal data object
      }
      console.error(`[TEST MOCK AXIOS] beforeEach POST suite: Error: Attempted unmocked GET request to ${url}`);
      throw new Error(`[TEST MOCK AXIOS] beforeEach POST suite: Attempted unmocked GET request to ${url}`);
    });

    // Default mock implementations for new tmdbClient mock functions for this suite
    mockSearchShows.mockResolvedValue([]); // Though likely not used directly in this suite
    mockGetSeasons.mockResolvedValue([]);   // For any underlying calls if any
    mockGetEpisodes.mockResolvedValue([]);  // For any underlying calls if any
    mockGetCast.mockResolvedValue([]);      // For any underlying calls if any
    mockGetPopularShowsFromTMDB.mockResolvedValue([]);
    mockGetRecentShowsFromTMDB.mockResolvedValue([]);
    mockGetTopRatedShowsFromTMDB.mockResolvedValue([]);
    mockGetGenresFromTMDB.mockResolvedValue([]);
    
    // Specific mock for mockGetShowDetails for this suite
    mockGetShowDetails.mockImplementation(async (showIdFromRoute: number): Promise<any | null> => { 
      if (showIdFromRoute === showToTrack.tmdbId) {
        return {
          name: showToTrack.name,
          overview: showToTrack.overview,
          first_air_date: showToTrack.firstAired, 
          networks: [{ name: showToTrack.network }],
          episode_run_time: [showToTrack.runtime || 0], 
          poster_path: showToTrack.image,
          backdrop_path: showToTrack.banner,
          vote_average: showToTrack.rating,
          genres: showToTrack.genres?.map(g => ({ name: g })) || [], 
          status: showToTrack.status,
        }; 
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
