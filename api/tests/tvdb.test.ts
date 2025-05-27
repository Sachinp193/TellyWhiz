import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as tvdbClient from '../tvdb.js';
import axios from 'axios';

// Mock axios
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  // Add other methods if needed
};

vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
    // Make sure to export AxiosInstance type if it's used by the module under test for typing
    AxiosInstance: vi.fn(), 
  };
});

describe('TVDB Service Functions', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks(); 
    mockAxiosInstance.get.mockReset(); 
    mockAxiosInstance.post.mockReset(); 
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (consoleLogSpy) {
      consoleLogSpy.mockRestore();
    }
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
  });

  describe('searchShows', () => {
    const query = 'test query';
    const mockTvdbSearchResponse = [
      {
        objectID: '12345',
        name: 'Show One',
        seriesName: 'Show One Alt', // Fallback
        image_url: '/image1.jpg',
        year: '2022',
        overview: 'Overview for Show One.',
      },
      {
        id: '67890', // Fallback for objectID
        // name is missing, should use seriesName
        seriesName: 'Show Two',
        image: '/image2.jpg', // Fallback for image_url
        first_aired: '2021-01-01', // Fallback for year
        // overview is missing
      },
      {
        objectID: '11223',
        name: 'Show Three',
        thumbnail: '/image3.jpg', // Fallback for image
        // year is missing
        overview: 'Overview for Show Three.',
      },
      {
        objectID: '44556',
        // name, seriesName missing
        image_url: '/image4.jpg',
        year: '2020',
        overview: 'Overview for Show Four.',
      }
    ];

    const expectedTransformedSearchResults = [
      {
        id: '12345',
        name: 'Show One',
        image: '/image1.jpg',
        year: '2022',
        overview: 'Overview for Show One.',
      },
      {
        id: '67890',
        name: 'Show Two',
        image: '/image2.jpg',
        year: '2021',
        overview: '',
      },
      {
        id: '11223',
        name: 'Show Three',
        image: '/image3.jpg',
        year: null,
        overview: 'Overview for Show Three.',
      },
      {
        id: '44556',
        name: 'Unknown Title',
        image: '/image4.jpg',
        year: '2020',
        overview: 'Overview for Show Four.',
      }
    ];

    it('should fetch, transform, and return search results on success', async () => {
      // Assuming TVDB search returns data directly in response.data.data
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: mockTvdbSearchResponse } });
      const result = await tvdbClient.searchShows(query);

      expect(consoleLogSpy).toHaveBeenCalledWith(`searchShows called with query: ${query}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/search?q=${encodeURIComponent(query)}`);
      expect(result).toEqual(expectedTransformedSearchResults);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should fetch, transform, and return search results if data is directly in response.data', async () => {
      // Test case for when results are directly in response.data
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTvdbSearchResponse });
      const result = await tvdbClient.searchShows(query);

      expect(consoleLogSpy).toHaveBeenCalledWith(`searchShows called with query: ${query}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/search?q=${encodeURIComponent(query)}`);
      expect(result).toEqual(expectedTransformedSearchResults);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array and log an error if the API call fails', async () => {
      const errorMessage = 'TVDB API Error for Search';
      mockAxiosInstance.get.mockRejectedValueOnce(new Error(errorMessage));
      const result = await tvdbClient.searchShows(query);

      expect(consoleLogSpy).toHaveBeenCalledWith(`searchShows called with query: ${query}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/search?q=${encodeURIComponent(query)}`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error fetching shows from TVDB for query "${query}":`,
        errorMessage
      );
    });

    it('should return an empty array if API returns no search results (e.g., empty data array)', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });
      const result = await tvdbClient.searchShows(query);

      expect(consoleLogSpy).toHaveBeenCalledWith(`searchShows called with query: ${query}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/search?q=${encodeURIComponent(query)}`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array if API returns non-array data for search results', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: null } }); // API returns null for data
      const result = await tvdbClient.searchShows(query);

      expect(consoleLogSpy).toHaveBeenCalledWith(`searchShows called with query: ${query}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/search?q=${encodeURIComponent(query)}`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `No search results data found or data is not an array for query "${query}" from TVDB.`
      );
    });
    
    it('should return an empty array if API response structure is unexpected (e.g., no data field)', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} }); // No 'data' field in response.data
      const result = await tvdbClient.searchShows(query);

      expect(consoleLogSpy).toHaveBeenCalledWith(`searchShows called with query: ${query}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/search?q=${encodeURIComponent(query)}`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `No search results data found or data is not an array for query "${query}" from TVDB.`
      );
    });
  });

  describe('getShowDetails', () => {
    const showId = 123;
    const mockTvdbShowDetailsResponse = {
      id: showId,
      name: 'Test Show',
      overview: 'This is a test show.',
      image: '/posters/123.jpg',
      artworks: [
        { type: 2, image: '/banners/123.jpg', language: 'eng' }, // banner
        { type: 6, image: '/backgrounds/123.jpg', language: 'eng' }, // background
        { type: 7, image: '/icons/123.jpg', language: 'eng' }, // icon
      ],
      year: '2023',
      firstAired: '2023-01-15',
      genres: [
        { id: 1, name: 'Drama', slug: 'drama' },
        { id: 2, name: 'Sci-Fi', slug: 'sci-fi' },
      ],
      status: { id: 1, name: 'Continuing', recordType: 'series', keepUpdated: true },
      score: 8.5,
    };

    const expectedTransformedShowDetails = {
      id: showId,
      name: 'Test Show',
      overview: 'This is a test show.',
      image: '/posters/123.jpg',
      banner: '/backgrounds/123.jpg',
      year: '2023',
      genres: ['Drama', 'Sci-Fi'],
      status: 'Continuing',
      rating: 8.5,
    };

    it('should fetch, transform, and return show details on success', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: mockTvdbShowDetailsResponse } });
      const result = await tvdbClient.getShowDetails(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getShowDetails called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}`);
      expect(result).toEqual(expectedTransformedShowDetails);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return null and log an error if the API call fails', async () => {
      const errorMessage = 'TVDB API Error';
      mockAxiosInstance.get.mockRejectedValueOnce(new Error(errorMessage));
      const result = await tvdbClient.getShowDetails(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getShowDetails called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}`);
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error fetching show details from TVDB for showId ${showId}:`,
        errorMessage
      );
    });

    it('should return null and log an error if essential data is missing', async () => {
      const incompleteData = { ...mockTvdbShowDetailsResponse, name: undefined };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: incompleteData } });
      const result = await tvdbClient.getShowDetails(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getShowDetails called with showId: ${showId}`);
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Essential data missing for showId ${showId} from TVDB.`);
    });
  });

  describe('getSeasons', () => {
    const showId = 456; // Use a different ID for clarity if desired
    const mockTvdbSeasonsResponse = [
      {
        id: 1000,
        seriesId: showId,
        type: { id: 1, name: 'Official', type: 'official', recordType: 'season' },
        number: 0, // Season 0 - Specials
        name: 'Specials',
        overview: 'Special episodes.',
        image: '/specials.jpg',
        episodeCount: 5,
        year: '2022',
        firstAired: '2022-06-01',
      },
      {
        id: 1001,
        seriesId: showId,
        type: { id: 1, name: 'Official', type: 'official', recordType: 'season' },
        number: 1,
        name: 'Season 1',
        overview: 'The first season.',
        image: '/season1.jpg',
        episodeCount: 10,
        year: '2023',
        firstAired: '2023-01-10',
      },
      {
        id: 1002,
        seriesId: showId,
        type: { id: 1, name: 'Official', type: 'official', recordType: 'season' },
        number: 2,
        name: null, // Test fallback name
        overview: '',
        image: null, // Test fallback image
        episodeCount: 8,
        year: '2024',
        // firstAired: null, // Test fallback year if firstAired is missing
      },
      {
        id: 1003,
        seriesId: showId,
        type: { id: 2, name: 'DVD', type: 'dvd', recordType: 'season' }, // Non-official season type
        number: 3,
        name: 'DVD Extras',
        overview: 'DVD extras.',
        image: '/dvd_extras.jpg',
        episodeCount: 3,
        year: '2024',
      },
    ];

    const expectedTransformedSeasons = [
      {
        id: 1001,
        seriesId: showId,
        number: 1,
        name: 'Season 1',
        overview: 'The first season.',
        image: '/season1.jpg',
        episodeCount: 10,
        year: '2023',
      },
      {
        id: 1002,
        seriesId: showId,
        number: 2,
        name: 'Season 2', // Fallback name
        overview: '',
        image: null,     // Fallback image
        episodeCount: 8,
        year: '2024',     // Fallback year (from season.year)
      },
    ];

    it('should fetch, transform, and return seasons on success (filtering season 0 and non-official)', async () => {
      // Assuming the API returns seasons directly in response.data.data as an array
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: mockTvdbSeasonsResponse } });
      const result = await tvdbClient.getSeasons(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getSeasons called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/seasons`);
      expect(result).toEqual(expectedTransformedSeasons);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array and log an error if the API call fails', async () => {
      const errorMessage = 'TVDB API Error for Seasons';
      mockAxiosInstance.get.mockRejectedValueOnce(new Error(errorMessage));
      const result = await tvdbClient.getSeasons(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getSeasons called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/seasons`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error fetching seasons from TVDB for showId ${showId}:`,
        errorMessage
      );
    });

    it('should return an empty array if API returns no seasons data (e.g., empty array)', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } }); // No seasons in the response
      const result = await tvdbClient.getSeasons(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getSeasons called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/seasons`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // Should not log an error for empty data, but for failed call
    });
    
    it('should return an empty array if API returns non-array data for seasons', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: null } }); // API returns null for seasons
      const result = await tvdbClient.getSeasons(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getSeasons called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/seasons`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`No seasons data found or data is not an array for showId ${showId} from TVDB.`);
    });
  });

  describe('getEpisodes', () => {
    const showId = 789; // Different ID for clarity
    const mockTvdbEpisodesResponse = [
      {
        id: 2001,
        seriesId: showId,
        seasonNumber: 1,
        number: 1,
        name: 'Pilot',
        overview: 'The first episode.',
        image: '/episode_s01e01.jpg',
        aired: '2023-01-10',
        runtime: 22,
        linkedSeason: 1001, // Example, may not be used in transformation
      },
      {
        id: 2002,
        seriesId: showId,
        seasonNumber: 1,
        number: 2,
        name: null, // Test fallback name
        overview: '', // Test fallback overview
        image: null, // Test fallback image
        aired: '2023-01-17',
        runtime: 0, // Test fallback runtime
      },
    ];

    const expectedTransformedEpisodes = [
      {
        id: 2001,
        seriesId: showId,
        seasonNumber: 1,
        episodeNumber: 1,
        name: 'Pilot',
        overview: 'The first episode.',
        image: '/episode_s01e01.jpg',
        aired: '2023-01-10',
        runtime: 22,
      },
      {
        id: 2002,
        seriesId: showId,
        seasonNumber: 1,
        episodeNumber: 2,
        name: 'Episode 2', // Fallback name
        overview: '',       // Fallback overview
        image: null,        // Fallback image
        aired: '2023-01-17',
        runtime: 0,         // Fallback runtime
      },
    ];

    it('should fetch, transform, and return episodes on success', async () => {
      // Assuming TVDB wraps episodes in response.data.data.episodes
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: { episodes: mockTvdbEpisodesResponse } } });
      const result = await tvdbClient.getEpisodes(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getEpisodes called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/episodes/default/eng`);
      expect(result).toEqual(expectedTransformedEpisodes);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array and log an error if the API call fails', async () => {
      const errorMessage = 'TVDB API Error for Episodes';
      mockAxiosInstance.get.mockRejectedValueOnce(new Error(errorMessage));
      const result = await tvdbClient.getEpisodes(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getEpisodes called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/episodes/default/eng`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error fetching episodes from TVDB for showId ${showId}:`,
        errorMessage
      );
    });

    it('should return an empty array if API returns no episodes data (e.g., empty array)', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: { episodes: [] } } });
      const result = await tvdbClient.getEpisodes(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getEpisodes called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/episodes/default/eng`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array if API returns non-array data for episodes', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: { episodes: null } } });
      const result = await tvdbClient.getEpisodes(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getEpisodes called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/episodes/default/eng`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`No episodes data found or data is not an array for showId ${showId} from TVDB.`);
    });
     it('should return an empty array if API response structure is unexpected (e.g. no data.episodes)', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: {} } }); // data.episodes is undefined
      const result = await tvdbClient.getEpisodes(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getEpisodes called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/episodes/default/eng`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`No episodes data found or data is not an array for showId ${showId} from TVDB.`);
    });
  });

  describe('getCast', () => {
    const showId = 321; // Different ID for clarity
    const mockTvdbCastResponse = [
      {
        id: 3001, // Character ID
        peopleId: 4001, // Actor ID
        personName: 'Actor One',
        name: 'Character Alpha', // Character Name
        image: '/actor_one.jpg',
        role: { id: 1, name: 'Actor', recordType: 'role' }, // Assuming a role object
        sort: 1,
      },
      {
        id: 3002,
        peopleId: 4002,
        personName: 'Actor Two',
        name: 'Character Beta',
        image: null, // Test fallback image
        role: { id: 1, name: 'Actor', recordType: 'role' },
        sort: 2,
      },
      { // Example of a record that might be filtered if we were stricter on role, but for now, it's included
        id: 3003,
        peopleId: 4003,
        personName: 'Director One',
        name: 'Director', // e.g. if a director was listed in characters, TVDB is sometimes like this
        image: '/director_one.jpg',
        role: { id: 2, name: 'Director', recordType: 'role' },
        sort: 3,
      },
      // Add 13 more mock cast members to test the slice(0, 15)
      ...Array.from({ length: 13 }, (_, i) => ({
        id: 3004 + i,
        peopleId: 4004 + i,
        personName: `Actor ${i + 3}`,
        name: `Character Gamma ${i + 1}`,
        image: `/actor_${i + 3}.jpg`,
        role: { id: 1, name: 'Actor', recordType: 'role' },
        sort: 4 + i,
      })),
       { // This one should be sliced off
        id: 3017,
        peopleId: 4017,
        personName: 'Actor 16',
        name: 'Character Zeta',
        image: '/actor_16.jpg',
        role: { id: 1, name: 'Actor', recordType: 'role' },
        sort: 17,
      }
    ];

    const expectedTransformedCast = [
      {
        id: 4001,
        name: 'Actor One',
        role: 'Character Alpha',
        image: '/actor_one.jpg',
      },
      {
        id: 4002,
        name: 'Actor Two',
        role: 'Character Beta',
        image: null,
      },
      {
        id: 4003,
        name: 'Director One',
        role: 'Director',
        image: '/director_one.jpg',
      },
      ...Array.from({ length: 12 }, (_, i) => ({ // Only 12 here because the first 3 are defined above
        id: 4004 + i,
        name: `Actor ${i + 3}`,
        role: `Character Gamma ${i + 1}`,
        image: `/actor_${i + 3}.jpg`,
      })),
    ];


    it('should fetch, transform, return cast (limited to 15), and log call on success', async () => {
      // Assuming TVDB cast data is in response.data.data as an array
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: mockTvdbCastResponse } });
      const result = await tvdbClient.getCast(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getCast called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/characters`);
      expect(result).toEqual(expectedTransformedCast);
      expect(result.length).toBe(15);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array and log an error if the API call fails', async () => {
      const errorMessage = 'TVDB API Error for Cast';
      mockAxiosInstance.get.mockRejectedValueOnce(new Error(errorMessage));
      const result = await tvdbClient.getCast(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getCast called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/characters`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error fetching cast from TVDB for showId ${showId}:`,
        errorMessage
      );
    });

    it('should return an empty array if API returns no cast data (e.g., empty array)', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });
      const result = await tvdbClient.getCast(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getCast called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/characters`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array if API returns non-array data for cast', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: null } });
      const result = await tvdbClient.getCast(showId);

      expect(consoleLogSpy).toHaveBeenCalledWith(`getCast called with showId: ${showId}`);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/series/${showId}/characters`);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`No cast data found or data is not an array for showId ${showId} from TVDB.`);
    });
  });

  describe('getPopularShows', () => {
    const mockTvdbPopularShowsResponse = [
      {
        id: 5001,
        name: 'Popular Show 1',
        seriesName: 'Popular Show One Alt', // Test fallback for name
        image: '/popular1.jpg',
        year: '2022',
        firstAired: '2022-03-01',
        overview: 'Overview of popular show 1.',
        // Add more fields if your transformation uses them
      },
      {
        id: 5002,
        name: 'Popular Show 2',
        image: null, // Test fallback image
        year: null,
        firstAired: '2021-05-15', // Test fallback year
        overview: '', // Test fallback overview
      },
      // Create 19 more to test the slice(0, 20)
      ...Array.from({ length: 19 }, (_, i) => ({
        id: 5003 + i,
        name: `Popular Show ${i + 3}`,
        image: `/popular${i + 3}.jpg`,
        year: `${2020 - i}`,
        overview: `Overview of popular show ${i + 3}.`,
      })),
      { // This 22nd show should be sliced off
        id: 5022,
        name: 'Popular Show 22',
        image: '/popular22.jpg',
        year: '2000',
        overview: 'Overview of popular show 22.',
      }
    ];

    const expectedTransformedPopularShows = [
      {
        id: 5001,
        name: 'Popular Show 1',
        image: '/popular1.jpg',
        year: '2022',
        overview: 'Overview of popular show 1.',
      },
      {
        id: 5002,
        name: 'Popular Show 2',
        image: null,
        year: '2021', // Derived from firstAired
        overview: '',
      },
      ...Array.from({ length: 18 }, (_, i) => ({ // 18 here because 2 are defined above
        id: 5003 + i,
        name: `Popular Show ${i + 3}`,
        image: `/popular${i + 3}.jpg`,
        year: `${2020 - i}`,
        overview: `Overview of popular show ${i + 3}.`,
      })),
    ];

    it('should fetch, transform, return popular shows (limited to 20), and log call on success', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: mockTvdbPopularShowsResponse } });
      const result = await tvdbClient.getPopularShows();

      expect(consoleLogSpy).toHaveBeenCalledWith('getPopularShows called');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/series/popular');
      expect(result).toEqual(expectedTransformedPopularShows);
      expect(result.length).toBe(20);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array and log an error if the API call fails', async () => {
      const errorMessage = 'TVDB API Error for Popular Shows';
      mockAxiosInstance.get.mockRejectedValueOnce(new Error(errorMessage));
      const result = await tvdbClient.getPopularShows();

      expect(consoleLogSpy).toHaveBeenCalledWith('getPopularShows called');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/series/popular');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching popular shows from TVDB:',
        errorMessage
      );
    });

    it('should return an empty array if API returns no popular shows data (e.g., empty array)', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });
      const result = await tvdbClient.getPopularShows();

      expect(consoleLogSpy).toHaveBeenCalledWith('getPopularShows called');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/series/popular');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
    
    it('should return an empty array if API returns non-array data for popular shows', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: null } });
      const result = await tvdbClient.getPopularShows();

      expect(consoleLogSpy).toHaveBeenCalledWith('getPopularShows called');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/series/popular');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('No popular shows data found or data is not an array from TVDB.');
    });
  });

  describe('getRecentShows', () => {
    const mockTvdbRecentShowsResponse = [
      {
        id: 6001,
        name: 'Recent Show 1',
        image: '/recent1.jpg',
        year: '2024',
        firstAired: '2024-01-01',
        overview: 'Overview of recent show 1.',
      },
      {
        id: 6002,
        name: 'Recent Show 2',
        image: null,
        year: '2023',
        firstAired: '2023-12-15',
        overview: '',
      },
      ...Array.from({ length: 20 }, (_, i) => ({ // Ensure enough items to test slice
        id: 6003 + i,
        name: `Recent Show ${i + 3}`,
        image: `/recent${i + 3}.jpg`,
        year: '2023',
        overview: `Overview of recent show ${i + 3}.`,
      })),
    ];

    const expectedTransformedRecentShows = [
      {
        id: 6001,
        name: 'Recent Show 1',
        image: '/recent1.jpg',
        year: '2024',
        overview: 'Overview of recent show 1.',
      },
      {
        id: 6002,
        name: 'Recent Show 2',
        image: null,
        year: '2023',
        overview: '',
      },
      ...Array.from({ length: 18 }, (_, i) => ({
        id: 6003 + i,
        name: `Recent Show ${i + 3}`,
        image: `/recent${i + 3}.jpg`,
        year: '2023',
        overview: `Overview of recent show ${i + 3}.`,
      })),
    ];

    it('should fetch, transform, return recent shows (limited to 20), and log call on success', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: mockTvdbRecentShowsResponse } });
      const result = await tvdbClient.getRecentShows();

      expect(consoleLogSpy).toHaveBeenCalledWith('getRecentShows called');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/series/recent');
      expect(result).toEqual(expectedTransformedRecentShows);
      expect(result.length).toBe(20);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array and log an error if the API call fails', async () => {
      const errorMessage = 'TVDB API Error for Recent Shows';
      mockAxiosInstance.get.mockRejectedValueOnce(new Error(errorMessage));
      const result = await tvdbClient.getRecentShows();

      expect(consoleLogSpy).toHaveBeenCalledWith('getRecentShows called');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/series/recent');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching recent shows from TVDB:',
        errorMessage
      );
    });

    it('should return an empty array if API returns no recent shows data', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });
      const result = await tvdbClient.getRecentShows();
      expect(result).toEqual([]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
    
    it('should return an empty array if API returns non-array data for recent shows', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: null } });
      const result = await tvdbClient.getRecentShows();
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('No recent shows data found or data is not an array from TVDB.');
    });
  });

  describe('getTopRatedShows', () => {
    const mockTvdbTopRatedShowsResponse = [
      {
        id: 7001,
        name: 'Top Rated Show 1',
        image: '/toprated1.jpg',
        year: '2020',
        score: 9.5, // Assuming score might be relevant for top_rated
        overview: 'Overview of top rated show 1.',
      },
      {
        id: 7002,
        name: 'Top Rated Show 2',
        image: null,
        year: '2019',
        score: 9.2,
        overview: '',
      },
      ...Array.from({ length: 20 }, (_, i) => ({ // Ensure enough items to test slice
        id: 7003 + i,
        name: `Top Rated Show ${i + 3}`,
        image: `/toprated${i + 3}.jpg`,
        year: `${2018 - i}`,
        score: 9.0 - i * 0.1,
        overview: `Overview of top rated show ${i + 3}.`,
      })),
    ];

    const expectedTransformedTopRatedShows = [
      {
        id: 7001,
        name: 'Top Rated Show 1',
        image: '/toprated1.jpg',
        year: '2020',
        overview: 'Overview of top rated show 1.',
      },
      {
        id: 7002,
        name: 'Top Rated Show 2',
        image: null,
        year: '2019',
        overview: '',
      },
      ...Array.from({ length: 18 }, (_, i) => ({
        id: 7003 + i,
        name: `Top Rated Show ${i + 3}`,
        image: `/toprated${i + 3}.jpg`,
        year: `${2018 - i}`,
        overview: `Overview of top rated show ${i + 3}.`,
      })),
    ];

    it('should fetch, transform, return top-rated shows (limited to 20), and log call on success', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: mockTvdbTopRatedShowsResponse } });
      const result = await tvdbClient.getTopRatedShows();

      expect(consoleLogSpy).toHaveBeenCalledWith('getTopRatedShows called');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/series/top_rated');
      expect(result).toEqual(expectedTransformedTopRatedShows);
      expect(result.length).toBe(20);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array and log an error if the API call fails', async () => {
      const errorMessage = 'TVDB API Error for Top Rated Shows';
      mockAxiosInstance.get.mockRejectedValueOnce(new Error(errorMessage));
      const result = await tvdbClient.getTopRatedShows();

      expect(consoleLogSpy).toHaveBeenCalledWith('getTopRatedShows called');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/series/top_rated');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching top-rated shows from TVDB:',
        errorMessage
      );
    });

    it('should return an empty array if API returns no top-rated shows data', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });
      const result = await tvdbClient.getTopRatedShows();
      expect(result).toEqual([]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array if API returns non-array data for top-rated shows', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: null } });
      const result = await tvdbClient.getTopRatedShows();
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('No top-rated shows data found or data is not an array from TVDB.');
    });
  });

  describe('getGenres', () => {
    const mockTvdbGenresResponse = [
      { id: 1, name: 'Action', slug: 'action' },
      { id: 2, name: 'Adventure', slug: 'adventure' },
      { id: 3, name: 'Comedy', slug: 'comedy' },
      { id: 4, name: null, slug: 'drama' }, // Test filtering of null names
      { id: 5, name: 'Sci-Fi', slug: 'sci-fi' },
    ];

    const expectedTransformedGenres = ['Action', 'Adventure', 'Comedy', 'Sci-Fi'];

    it('should fetch, transform, and return genre names on success', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: mockTvdbGenresResponse } });
      const result = await tvdbClient.getGenres();

      expect(consoleLogSpy).toHaveBeenCalledWith('getGenres called');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/genres');
      expect(result).toEqual(expectedTransformedGenres);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array and log an error if the API call fails', async () => {
      const errorMessage = 'TVDB API Error for Genres';
      mockAxiosInstance.get.mockRejectedValueOnce(new Error(errorMessage));
      const result = await tvdbClient.getGenres();

      expect(consoleLogSpy).toHaveBeenCalledWith('getGenres called');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/genres');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching genres from TVDB:',
        errorMessage
      );
    });

    it('should return an empty array if API returns no genres data (e.g., empty array)', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });
      const result = await tvdbClient.getGenres();

      expect(consoleLogSpy).toHaveBeenCalledWith('getGenres called');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/genres');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return an empty array if API returns non-array data for genres', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: null } });
      const result = await tvdbClient.getGenres();

      expect(consoleLogSpy).toHaveBeenCalledWith('getGenres called');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/genres');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('No genres data found or data is not an array from TVDB.');
    });
  });
});
