import request from 'supertest';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
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

// Helper function to register a user
const registerUser = async (username, password) => {
  return request(app).post('/api/auth/register').send({ username, password });
};

// Helper function to login a user and return an authenticated agent
const loginUser = async (username, password) => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password });
  return agent;
};


describe('GET /api/search', () => {
  beforeEach(async () => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Default mock implementations for tvdb methods to prevent unintended errors
    // from other parts of the application during setup or unrelated calls.
    (tmdbMockObject.searchShows as vi.Mock).mockResolvedValue([]);
    (tmdbMockObject.getShowDetails as vi.Mock).mockResolvedValue(null); // Default to not found
    (tmdbMockObject.getSeasons as vi.Mock).mockResolvedValue([]);
    (tmdbMockObject.getEpisodes as vi.Mock).mockResolvedValue([]);
    (tmdbMockObject.getCast as vi.Mock).mockResolvedValue([]);
    (tmdbMockObject.getPopularShowsFromTMDB as vi.Mock).mockResolvedValue([]);
    (tmdbMockObject.getRecentShowsFromTMDB as vi.Mock).mockResolvedValue([]);
    (tmdbMockObject.getTopRatedShowsFromTMDB as vi.Mock).mockResolvedValue([]);
    (tmdbMockObject.getGenresFromTMDB as vi.Mock).mockResolvedValue([]);
  });

  // Clean up database after each search test if necessary, though search is read-only
  // For now, assuming search tests don't modify DB in a way that needs cleanup here.

  it('should return 200 and search results for a valid query', async () => {
    const mockShows = [
      { id: 1, tvdb_id: 101, name: 'Test Show 1', overview: 'Overview 1', image: 'image1.jpg', year: '2023', first_aired: '2023-01-01', network: 'Network1', status: 'Running', runtime: 30, banner: 'banner1.jpg', rating: 8, genres: ['Drama'] },
      { id: 2, tvdb_id: 102, name: 'Test Show 2', overview: 'Overview 2', image: 'image2.jpg', year: '2022', first_aired: '2022-01-01', network: 'Network2', status: 'Ended', runtime: 60, banner: 'banner2.jpg', rating: 9, genres: ['Comedy'] },
    ];
    // Now mock searchShows on the imported (and mocked) tmdbMockObject
    (tmdbMockObject.searchShows as vi.Mock).mockResolvedValue(mockShows);

    const response = await request(app).get('/api/search?q=ValidQuery');

    expect(response.status).toBe(200);
    // The /api/search endpoint directly returns what tvdb.searchShows returns.
    // It doesn't map tvdb_id to id.
    expect(response.body).toEqual(mockShows);
    expect(tmdbMockObject.searchShows).toHaveBeenCalledWith('ValidQuery');
  });

  it('should return 400 if the query is too short', async () => {
    const response = await request(app).get('/api/search?q=a');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Query must be at least 2 characters' });
    expect(tmdbMockObject.searchShows).not.toHaveBeenCalled();
  });

  it('should return 500 if TMDB API call fails', async () => {
    (tmdbMockObject.searchShows as vi.Mock).mockRejectedValue(new Error('TMDB API Error'));

    const response = await request(app).get('/api/search?q=ErrorQuery');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Failed to search shows' });
    expect(tmdbMockObject.searchShows).toHaveBeenCalledWith('ErrorQuery');
  });
});

describe('POST /api/user/shows/:id/track', () => {
  const testUser = {
    username: 'trackerUser',
    password: 'password123',
  };
  let userId;
  let authenticatedAgent;

  const showToTrack = {
    tvdbId: 123, 
    name: "Test Show for Tracking",
    overview: "An overview.",
    status: "Running",
    firstAired: "2023-01-01", // Changed from first_aired to firstAired
    network: "Test Network",
    runtime: 30,
    image: "test_image.jpg",
    banner: "test_banner.jpg",
    rating: 8.0,
    genres: ["Drama"],
    year: "2023-Present"
    // Add any other fields required by schema.shows if missing
  };

  beforeAll(async () => {
    // Register and login the user once for all tests in this describe block
    await registerUser(testUser.username, testUser.password);
    authenticatedAgent = await loginUser(testUser.username, testUser.password);
    // Get the user ID for direct DB assertions
    const user = await db.query.users.findFirst({ where: eq(schema.users.username, testUser.username) });
    if (user) {
      userId = user.id;
    }
  });

  beforeEach(async () => {
    // Reset mocks before each test in this block
    vi.resetAllMocks(); 

    // Default mocks for other tvdb functions not directly under test in this suite
    (tmdbMockObject.searchShows as vi.Mock).mockResolvedValue([]);
    (tmdbMockObject.getSeasons as vi.Mock).mockResolvedValue([]);
    // ... etc. for other methods if they might be called during app init for these specific tests.

    // Option A: Mock tvdb.getShowDetails to also call storage.saveShow
    vi.spyOn(tmdbMockObject, 'getShowDetails').mockImplementation(async (showIdFromRoute) => {
      if (showIdFromRoute === showToTrack.tvdbId) {
        // Call the real storage.saveShow to ensure it's in the DB
        // This will insert or update the show in the 'shows' table.
        const savedShow = await storage.saveShow(showToTrack);
        // The route expects an object that includes at least the fields of the 'Show' schema.
        // storage.saveShow returns the saved/updated show object from the DB, which should be suitable.
        return savedShow; 
      }
      return null; // Simulate show not found for other IDs
    });
  });

  afterEach(async () => {
    // Clean up userShows and shows table after each test to ensure isolation
    // Note: Order matters due to foreign key constraints.
    if (userId) {
      await db.delete(schema.userShows).where(eq(schema.userShows.userId, userId));
    }
    // Only delete the specific show inserted by these tests
    await db.delete(schema.shows).where(eq(schema.shows.tvdbId, showToTrack.tvdbId));
  });

  afterAll(async () => {
    // Clean up the test user
    if (userId) {
      await db.delete(schema.users).where(eq(schema.users.id, userId));
    }
  });

  it('should successfully track a new show for an authenticated user', async () => {
    const response = await authenticatedAgent
      .post(`/api/user/shows/${showToTrack.tvdbId}/track`);

    expect(response.status).toBe(200); // Assuming 200 for successful tracking
    expect(response.body).toMatchObject({
      userId: userId,
      showId: expect.any(Number), // The internal DB ID of the show
      status: 'watching',
      favorite: false,
    });

    // Assert Database State
    // 1. Check if the show was saved to the `shows` table
    const dbShow = await db.query.shows.findFirst({
      where: eq(schema.shows.tvdbId, showToTrack.tvdbId),
    });
    expect(dbShow).toBeDefined();
    expect(dbShow.name).toBe(showToTrack.name);

    // 2. Check if the `userShows` record was created
    const dbUserShow = await db.query.userShows.findFirst({
      where: eq(schema.userShows.userId, userId) && eq(schema.userShows.showId, dbShow.id),
    });
    expect(dbUserShow).toBeDefined();
    expect(dbUserShow.status).toBe('watching');
  });

  it('should return an error or handle gracefully when tracking an already tracked show', async () => {
    // First, track the show
    await authenticatedAgent.post(`/api/user/shows/${showToTrack.tvdbId}/track`);

    // Then, attempt to track it again
    const response = await authenticatedAgent
      .post(`/api/user/shows/${showToTrack.tvdbId}/track`);
    
    // The current implementation of storage.trackShow simply inserts.
    // This will cause a unique constraint violation on (user_id, show_id) in user_shows if not handled.
    // Or, if the show is inserted again by getShowDetails, it might violate unique tvdb_id on shows table.
    // For now, let's expect a 500, as the application might not handle this gracefully yet.
    // A more robust API might return 409 Conflict or 200 OK (if idempotent).
    // Based on storage.ts, getShowDetails saves the show, and trackShow saves the userShow.
    // If getShowDetails is called twice for the same showId, it should ideally update or do nothing.
    // If trackShow is called twice, it will attempt to insert a duplicate userShow.

    // Let's check the actual behavior. The routes.ts uses storage.trackShow.
    // storage.trackShow does:
    // const newShow = await getShowDetails(showId); // This showId is tvdb_id
    // ... insert into userShows ...
    // If the show is already in the DB, getShowDetails might return it or fetch again.
    // The crucial part is the insert into userShows. Drizzle's `db.insert()...` will fail on conflict.

    expect(response.status).toBe(500); // Expecting a server error due to potential unique constraint violation
    expect(response.body.message).toContain('Failed to track show'); // Or a more specific DB error message

    // Assert Database State: Ensure no duplicate userShows record
    const dbShow = await db.query.shows.findFirst({ where: eq(schema.shows.tvdbId, showToTrack.tvdbId) });
    if (!dbShow) throw new Error("Show not found after tracking for count assertion");
    const userShowsCountResult = await db.select({ count: sql<number>`count(*)` }).from(schema.userShows)
      .where(eq(schema.userShows.userId, userId) && eq(schema.userShows.showId, dbShow.id));
    expect(userShowsCountResult[0].count).toBe(1);
  });

  it('should return 401 when trying to track a show without authentication', async () => {
    const response = await request(app) // Fresh, unauthenticated agent
      .post(`/api/user/shows/${showToTrack.tvdbId}/track`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Unauthorized');
  });
});
