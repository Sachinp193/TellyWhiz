// server/tests/tmdb.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mockAxiosGet is available to the hoisted vi.mock factory
const { mockAxiosGet } = vi.hoisted(() => {
  return { mockAxiosGet: vi.fn() };
});

// Mock axios BEFORE importing tmdb
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({ get: mockAxiosGet })),
  },
}));

// Now import tvdb. It will use the mocked axios.
import { tmdbClient as tvdb } from '../tmdb';

// Mock storage module
vi.mock('../storage', async (importOriginal) => {
  const actualStorage = await importOriginal();
  return {
    ...(actualStorage as any),
    storage: {
      getShowByTvdbId: vi.fn(),
      saveShow: vi.fn(data => Promise.resolve(data)),
      getSeasonsByShowId: vi.fn(),
      saveSeasons: vi.fn(data => Promise.resolve(data)),
      getEpisodesByShowId: vi.fn(),
      saveEpisodes: vi.fn(data => Promise.resolve(data)),
    }
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockAxiosGet.mockReset(); // Reset the shared mock function
});

describe('TMDB Service Functions', () => {
  describe('getPopularShowsFromTMDB', () => {
    it('should return popular shows on successful API response', async () => {
      const mockData = { results: [{ id: 1, name: 'Popular Show' }] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await tvdb.getPopularShowsFromTMDB();

      expect(mockAxiosGet).toHaveBeenCalledWith('/tv/popular', {
        params: { language: 'en-US', page: 1 },
      });
      expect(result).toEqual(mockData.results);
    });

    it('should throw an error if API response is not as expected (no results)', async () => {
      mockAxiosGet.mockResolvedValue({ data: { message: 'No results found' } }); 

      await expect(tvdb.getPopularShowsFromTMDB()).rejects.toThrow(
        'Invalid response structure from TMDB for popular shows'
      );
    });

    it('should throw an error on API failure', async () => {
      const errorMessage = 'Network Error';
      mockAxiosGet.mockRejectedValue(new Error(errorMessage));

      await expect(tvdb.getPopularShowsFromTMDB()).rejects.toThrow(
        `Failed to get popular shows from TMDB: ${errorMessage}`
      );
    });
  });

  describe('getRecentShowsFromTMDB', () => {
    it('should return recent shows on successful API response', async () => {
      const mockData = { results: [{ id: 1, name: 'Recent Show' }] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await tvdb.getRecentShowsFromTMDB();

      expect(mockAxiosGet).toHaveBeenCalledWith('/tv/on_the_air', {
        params: { language: 'en-US', page: 1 },
      });
      expect(result).toEqual(mockData.results);
    });

    it('should throw an error if API response is not as expected (no results)', async () => {
      mockAxiosGet.mockResolvedValue({ data: {} }); 

      await expect(tvdb.getRecentShowsFromTMDB()).rejects.toThrow(
         'Invalid response structure from TMDB for recent shows'
      );
    });

    it('should throw an error on API failure', async () => {
      const errorMessage = 'API down';
      mockAxiosGet.mockRejectedValue(new Error(errorMessage));

      await expect(tvdb.getRecentShowsFromTMDB()).rejects.toThrow(
        `Failed to get recent shows from TMDB: ${errorMessage}`
      );
    });
  });

  describe('getTopRatedShowsFromTMDB', () => {
    it('should return top-rated shows on successful API response', async () => {
      const mockData = { results: [{ id: 1, name: 'Top Rated Show' }] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await tvdb.getTopRatedShowsFromTMDB();

      expect(mockAxiosGet).toHaveBeenCalledWith('/tv/top_rated', {
        params: { language: 'en-US', page: 1 },
      });
      expect(result).toEqual(mockData.results);
    });
    
    it('should throw an error if API response is not as expected (no results)', async () => {
      mockAxiosGet.mockResolvedValue({ data: { results: null } }); 

      await expect(tvdb.getTopRatedShowsFromTMDB()).rejects.toThrow(
        'Invalid response structure from TMDB for top-rated shows'
      );
    });

    it('should throw an error on API failure', async () => {
      const errorMessage = 'Request timed out';
      mockAxiosGet.mockRejectedValue(new Error(errorMessage));

      await expect(tvdb.getTopRatedShowsFromTMDB()).rejects.toThrow(
        `Failed to get top-rated shows from TMDB: ${errorMessage}`
      );
    });
  });

  describe('getGenresFromTMDB', () => {
    it('should return genres on successful API response', async () => {
      const mockData = { genres: [{ id: 28, name: 'Action' }, {id: 12, name: 'Adventure'}] };
      mockAxiosGet.mockResolvedValue({ data: mockData });

      const result = await tvdb.getGenresFromTMDB();

      expect(mockAxiosGet).toHaveBeenCalledWith('/genre/tv/list', {
        params: { language: 'en-US' },
      });
      expect(result).toEqual(['Action', 'Adventure']);
    });

    it('should throw an error if API response is not as expected (no genres)', async () => {
      mockAxiosGet.mockResolvedValue({ data: {} }); 

      await expect(tvdb.getGenresFromTMDB()).rejects.toThrow(
        'Invalid response structure from TMDB for genres'
      );
    });

    it('should throw an error on API failure', async () => {
      const errorMessage = 'Unauthorized';
      mockAxiosGet.mockRejectedValue(new Error(errorMessage));

      await expect(tvdb.getGenresFromTMDB()).rejects.toThrow(
        `Failed to get genres from TMDB: ${errorMessage}`
      );
    });
  });

  describe('searchShows', () => {
    it('should return search results on successful API response', async () => {
      const mockResults = [{ id: 1, name: 'Test Show', overview: 'Overview', year: '2024' }];
      mockAxiosGet.mockResolvedValue({ data: { results: mockResults } });
      const result = await tvdb.searchShows('Test');
      expect(mockAxiosGet).toHaveBeenCalledWith('/search/tv', expect.any(Object));
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Test Show');
    });

    it('should throw an error on API failure during searchShows', async () => {
      const errorMessage = 'Search API Error';
      mockAxiosGet.mockRejectedValue(new Error(errorMessage));
      await expect(tvdb.searchShows('Test')).rejects.toThrow(
        `Failed to search shows on TMDB: ${errorMessage}`
      );
    });
     it('should return empty array if results are not in response, but not throw', async () => {
      mockAxiosGet.mockResolvedValue({ data: { message: "No results field" } });
      const result = await tvdb.searchShows('QueryWithNoResultsField');
      expect(result).toEqual([]);
    });
  });

  describe('getSeasons', () => {
    let storageMock;

    beforeEach(async () => {
      const storageModule = await import('../storage');
      storageMock = storageModule.storage;
      (storageMock.getSeasonsByShowId as vi.Mock).mockReset();
    });

    it('should throw an error on API failure during getSeasons (when not in storage)', async () => {
      (storageMock.getSeasonsByShowId as vi.Mock).mockResolvedValue([]); 
      const errorMessage = 'Seasons API Error';
      mockAxiosGet.mockRejectedValue(new Error(errorMessage)); 

      await expect(tvdb.getSeasons(123)).rejects.toThrow(
        `Failed to get seasons from TMDB: ${errorMessage}`
      );
      expect(storageMock.getSeasonsByShowId).toHaveBeenCalledWith(123);
    });
    
    it('should return empty array from getSeasons if API response has no seasons (when not in storage and TMDB call is made)', async () => {
      (storageMock.getSeasonsByShowId as vi.Mock).mockResolvedValue([]); 
      mockAxiosGet.mockResolvedValue({ data: { message: "No seasons field" } }); 
      
      const result = await tvdb.getSeasons(123);
      
      expect(storageMock.getSeasonsByShowId).toHaveBeenCalledWith(123);
      expect(result).toEqual([]);
    });
  });

  describe('getEpisodes', () => {
    let storageMock;
    let originalTvdbGetSeasons; 

    beforeEach(async () => {
      const storageModule = await import('../storage');
      storageMock = storageModule.storage;
      (storageMock.getEpisodesByShowId as vi.Mock).mockReset();
      
      originalTvdbGetSeasons = tvdb.getSeasons; 
      tvdb.getSeasons = vi.fn(); 
    });

    afterEach(() => {
        tvdb.getSeasons = originalTvdbGetSeasons; 
    });

    it('should throw an error on API failure during getEpisodes (when not in storage and seasons fetch fails)', async () => {
      (storageMock.getEpisodesByShowId as vi.Mock).mockResolvedValue([]); 
      const errorMessage = 'Episodes API Error (from seasons)';
      (tvdb.getSeasons as vi.Mock).mockRejectedValue(new Error(errorMessage)); 
      
      await expect(tvdb.getEpisodes(123)).rejects.toThrow(errorMessage);
      expect(storageMock.getEpisodesByShowId).toHaveBeenCalledWith(123);
      expect(tvdb.getSeasons).toHaveBeenCalledWith(123);
    });
    
    it('should return empty array from getEpisodes if no seasons are found (when not in storage)', async () => {
      (storageMock.getEpisodesByShowId as vi.Mock).mockResolvedValue([]); 
      (tvdb.getSeasons as vi.Mock).mockResolvedValue([]); 
      
      const result = await tvdb.getEpisodes(123);
      
      expect(storageMock.getEpisodesByShowId).toHaveBeenCalledWith(123);
      expect(tvdb.getSeasons).toHaveBeenCalledWith(123);
      expect(result).toEqual([]);
    });
  });

  describe('getCast', () => {
    it('should return cast on successful API response', async () => {
        const mockCast = [{ id: 1, name: 'Actor', character: 'Role' }];
        mockAxiosGet.mockResolvedValue({ data: { cast: mockCast }});
        const result = await tvdb.getCast(123);
        expect(mockAxiosGet).toHaveBeenCalledWith('/tv/123/credits');
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Actor');
    });
    
    it('should throw an error on API failure during getCast', async () => {
      const errorMessage = 'Cast API Error';
      mockAxiosGet.mockRejectedValue(new Error(errorMessage));
      await expect(tvdb.getCast(123)).rejects.toThrow(
        `Failed to get cast from TMDB: ${errorMessage}`
      );
    });

    it('should return empty array if API response has no cast field', async () => {
      mockAxiosGet.mockResolvedValue({ data: { message: "No cast field" } });
      const result = await tvdb.getCast(123);
      expect(result).toEqual([]);
    });
  });
});
