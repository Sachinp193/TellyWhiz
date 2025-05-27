import axios, { AxiosInstance } from 'axios';
import { NotFoundError, UpstreamApiError, AuthenticationError, RateLimitError } from './errors.js'; // Added .js

// Define the TheTVDB API base URL
const TVDB_BASE_URL = 'https://api4.thetvdb.com/v4';

// Access TheTVDB API key from environment variable
const TVDB_API_KEY = process.env.TVDB_API_KEY;

// Create an axios instance configured for TheTVDB API
const tvdbApi: AxiosInstance = axios.create({
  baseURL: TVDB_BASE_URL,
  headers: {
    'Authorization': `Bearer ${TVDB_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Placeholder function to search for shows
export const searchShows = async (query: string): Promise<any[]> => {
  console.log(`searchShows called with query: ${query}`);
  try {
    const response = await tvdbApi.get(`/search?q=${encodeURIComponent(query)}`);
    // TVDB search endpoint (/search) can return results in response.data or response.data.data
    let rawResults = null;
    if (Array.isArray(response.data)) {
      rawResults = response.data;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      rawResults = response.data.data;
    }

    if (!rawResults || !Array.isArray(rawResults)) {
      console.error(`No search results data found or data is not an array for query "${query}" from TVDB.`);
      return [];
    }

    const transformedResults = rawResults.map((show: any) => {
      // Fields might vary based on the actual TVDB search response structure.
      // Common fields: id, objectID, name, seriesName, overview, image, image_url, first_aired, year, thumbnail
      return {
        id: show.objectID || show.id, // TVDB search results might use objectID or id
        name: show.name || show.seriesName || 'Unknown Title',
        image: show.image_url || show.image || show.thumbnail || null,
        year: show.year || (show.first_aired ? new Date(show.first_aired).getFullYear().toString() : null),
        overview: show.overview || '',
      };
    });

    return transformedResults;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        throw new NotFoundError(`Search results not found for query "${query}" on TVDB.`);
      } else if (status === 401 || status === 403) {
        throw new AuthenticationError(`TVDB authentication error (${status}) for query "${query}". Check API key.`);
      } else if (status === 429) {
        throw new RateLimitError(`Rate limited by TVDB API when searching for query "${query}".`);
      } else {
        throw new UpstreamApiError(`TVDB API error (${status || 'Unknown'}) for query "${query}": ${error.message}`);
      }
    }
    throw new UpstreamApiError(`Unexpected error fetching search results for query "${query}": ${error.message}`);
  }
};

// Placeholder function to get show details
export const getShowDetails = async (showId: number | string): Promise<any | null> => {
  console.log(`getShowDetails called with showId: ${showId}`);
  try {
    const response = await tvdbApi.get(`/series/${showId}`);
    const rawData = response.data?.data; // Assuming TVDB wraps data in a 'data' property

    if (!rawData || !rawData.id || !rawData.name) {
      // This condition might indicate "not found" if the API returns 200 but empty/invalid data for an ID.
      throw new NotFoundError(`Show details not found or incomplete for showId ${showId} from TVDB.`);
    }

    // Data Transformation
    const transformedShow = {
      id: rawData.id,
      name: rawData.name,
      overview: rawData.overview || '',
      image: rawData.image || null, // Ensure it's a usable URL or handle base paths if necessary
      banner: rawData.artworks?.find((art: any) => art.type === 6 && art.language === 'eng')?.image || // type 6 for background, often 'eng'
              rawData.artworks?.find((art: any) => art.type === 6)?.image || // fallback to any language background
              null,
      year: rawData.year || (rawData.firstAired ? new Date(rawData.firstAired).getFullYear().toString() : null),
      genres: rawData.genres?.map((genre: any) => genre.name).filter(Boolean) || [],
      status: rawData.status?.name || 'Unknown',
      rating: rawData.score || 0, // TVDB uses 'score'
      // Add any other fields your application might need
    };

    return transformedShow;
  } catch (error: any) {
    if (error instanceof NotFoundError) throw error; // Re-throw if already specific

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        throw new NotFoundError(`Show with id ${showId} not found on TVDB.`);
      } else if (status === 401 || status === 403) {
        throw new AuthenticationError(`TVDB authentication error (${status}) for showId ${showId}. Check API key.`);
      } else if (status === 429) {
        throw new RateLimitError(`Rate limited by TVDB API when fetching showId ${showId}.`);
      } else {
        throw new UpstreamApiError(`TVDB API error (${status || 'Unknown'}) for showId ${showId}: ${error.message}`);
      }
    }
    // Fallback for non-Axios errors or other issues
    throw new UpstreamApiError(`Unexpected error fetching show details for showId ${showId}: ${error.message}`);
  }
};

// Placeholder function to get seasons for a show
export const getSeasons = async (showId: number | string): Promise<any[]> => {
  console.log(`getSeasons called with showId: ${showId}`);
  try {
    const response = await tvdbApi.get(`/series/${showId}/seasons`);
    // TheTVDB /seasons endpoint might return seasons directly in response.data.data or response.data.data.seasons
    // Let's assume it's response.data.data which is an array of season objects.
    // If it's nested further, e.g. response.data.data.seasons, this needs adjustment.
    // Based on https://thetvdb.github.io/v4-api/#/series/getSeriesSeasons
    // it seems the seasons are in response.data.data (array)
    const rawSeasons = response.data?.data;

    if (!rawSeasons || !Array.isArray(rawSeasons)) {
      // Assuming if rawSeasons is empty or not an array, it means no seasons were found or data is invalid.
      throw new NotFoundError(`No seasons found for showId ${showId} from TVDB, or data format is incorrect.`);
    }

    const transformedSeasons = rawSeasons
      .filter((season: any) => season.type?.type === 'official' && season.number > 0) // Filter for official seasons and number > 0
      .map((season: any) => {
        return {
          id: season.id, // TVDB season ID
          seriesId: season.seriesId,
          number: season.number,
          name: season.name || `Season ${season.number}`,
          overview: season.overview || '', // Overview might be sparse for seasons
          image: season.image || null, // Season poster
          episodeCount: season.episodeCount || 0, // Might be available directly or needs calculation
          year: season.year || (season.firstAired ? new Date(season.firstAired).getFullYear().toString() : null),
          // Add any other fields your application might need
        };
      });

    return transformedSeasons;
  } catch (error: any) {
    if (error instanceof NotFoundError) throw error;

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        // This might also mean the show itself wasn't found, or it has no seasons.
        throw new NotFoundError(`Seasons for showId ${showId} not found on TVDB (or show itself not found).`);
      } else if (status === 401 || status === 403) {
        throw new AuthenticationError(`TVDB authentication error (${status}) fetching seasons for showId ${showId}. Check API key.`);
      } else if (status === 429) {
        throw new RateLimitError(`Rate limited by TVDB API fetching seasons for showId ${showId}.`);
      } else {
        throw new UpstreamApiError(`TVDB API error (${status || 'Unknown'}) fetching seasons for showId ${showId}: ${error.message}`);
      }
    }
    throw new UpstreamApiError(`Unexpected error fetching seasons for showId ${showId}: ${error.message}`);
  }
};

// Placeholder function to get episodes for a show
export const getEpisodes = async (showId: number | string): Promise<any[]> => {
  console.log(`getEpisodes called with showId: ${showId}`);
  try {
    // Assuming 'default' is the official season/episode ordering and 'eng' for English language.
    // TheTVDB API docs suggest /series/{id}/episodes/{seasonType}/{lang}
    // And that the response contains a `data.episodes` array.
    const response = await tvdbApi.get(`/series/${showId}/episodes/default/eng`);
    const rawEpisodes = response.data?.data?.episodes;

    if (!rawEpisodes || !Array.isArray(rawEpisodes)) {
      // Assuming if rawEpisodes is empty or not an array, it means no episodes were found or data is invalid.
      throw new NotFoundError(`No episodes found for showId ${showId} from TVDB, or data format is incorrect.`);
    }

    const transformedEpisodes = rawEpisodes.map((episode: any) => {
      return {
        id: episode.id,
        seriesId: episode.seriesId,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.number, // 'number' usually means episode number in season
        name: episode.name || `Episode ${episode.number}`,
        overview: episode.overview || '',
        image: episode.image || null,
        aired: episode.aired || null, // Keep as YYYY-MM-DD string or convert to Date object if needed
        runtime: episode.runtime || 0,
        // 'linkedSeason' might not be directly needed if seasonNumber is already present
        // Add any other fields your application might need
      };
    });

    return transformedEpisodes;
  } catch (error: any) {
    if (error instanceof NotFoundError) throw error;

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        // This might also mean the show itself wasn't found, or it has no episodes.
        throw new NotFoundError(`Episodes for showId ${showId} not found on TVDB (or show itself not found).`);
      } else if (status === 401 || status === 403) {
        throw new AuthenticationError(`TVDB authentication error (${status}) fetching episodes for showId ${showId}. Check API key.`);
      } else if (status === 429) {
        throw new RateLimitError(`Rate limited by TVDB API fetching episodes for showId ${showId}.`);
      } else {
        throw new UpstreamApiError(`TVDB API error (${status || 'Unknown'}) fetching episodes for showId ${showId}: ${error.message}`);
      }
    }
    throw new UpstreamApiError(`Unexpected error fetching episodes for showId ${showId}: ${error.message}`);
  }
};

// Placeholder function to get cast for a show
export const getCast = async (showId: number | string): Promise<any[]> => {
  console.log(`getCast called with showId: ${showId}`);
  try {
    // TheTVDB API for characters: /series/{id}/characters
    // The response is expected to be an array of character objects directly in response.data.data
    const response = await tvdbApi.get(`/series/${showId}/characters`);
    const rawCast = response.data?.data;

    if (!rawCast || !Array.isArray(rawCast)) {
      // Assuming if rawCast is empty or not an array, it means no cast was found or data is invalid.
      throw new NotFoundError(`No cast found for showId ${showId} from TVDB, or data format is incorrect.`);
    }

    const transformedCast = rawCast
      // Optional: Filter for actual actors if the 'role' field is available and differentiates.
      // Example: .filter((member: any) => member.role?.name === 'Actor' || member.type === 'Actor')
      // For now, assuming all returned are relevant or we take them as is.
      .map((member: any) => {
        return {
          id: member.peopleId || member.id, // Prefer peopleId if available, fallback to character id
          name: member.personName, // Actor's name
          role: member.name,       // Character's name
          image: member.image || null,
          // Add any other fields your application might need, e.g., sortOrder
        };
      })
      .slice(0, 15); // Limit to top 15 cast members

    return transformedCast;
  } catch (error: any) {
    if (error instanceof NotFoundError) throw error;

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        // This might also mean the show itself wasn't found.
        throw new NotFoundError(`Cast for showId ${showId} not found on TVDB (or show itself not found).`);
      } else if (status === 401 || status === 403) {
        throw new AuthenticationError(`TVDB authentication error (${status}) fetching cast for showId ${showId}. Check API key.`);
      } else if (status === 429) {
        throw new RateLimitError(`Rate limited by TVDB API fetching cast for showId ${showId}.`);
      } else {
        throw new UpstreamApiError(`TVDB API error (${status || 'Unknown'}) fetching cast for showId ${showId}: ${error.message}`);
      }
    }
    throw new UpstreamApiError(`Unexpected error fetching cast for showId ${showId}: ${error.message}`);
  }
};

// Placeholder function to get popular shows
export const getPopularShows = async (): Promise<any[]> => {
  console.log('getPopularShows called');
  try {
    // Using /series/popular as placeholder endpoint.
    // TVDB docs might suggest filtering by score or a dedicated popular endpoint.
    // e.g. /series?sort=score&sortDirection=desc
    // For now, /series/popular is used.
    // The response is often an array of series objects in response.data.data
    const response = await tvdbApi.get(`/series/popular`); // Or a more specific endpoint if available
    const rawShows = response.data?.data;

    if (!rawShows || !Array.isArray(rawShows)) {
      throw new NotFoundError('No popular shows found from TVDB, or data format is incorrect.');
    }

    const transformedShows = rawShows
      .map((show: any) => {
        return {
          id: show.id,
          name: show.name || show.seriesName, // TVDB uses 'name' for series name typically
          image: show.image || null,
          year: show.year || (show.firstAired ? new Date(show.firstAired).getFullYear().toString() : null),
          overview: show.overview || '',
          // Add any other fields your application might need for list display
        };
      })
      .slice(0, 20); // Limit to top 20 popular shows

    return transformedShows;
  } catch (error: any) {
    if (error instanceof NotFoundError) throw error;

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Popular shows endpoint might not return 404 for "none found" but rather an empty list.
      // A 404 here would likely indicate the endpoint /series/popular itself is not found.
      if (status === 404) {
        throw new NotFoundError('Popular shows endpoint not found on TVDB.');
      } else if (status === 401 || status === 403) {
        throw new AuthenticationError(`TVDB authentication error (${status}) fetching popular shows. Check API key.`);
      } else if (status === 429) {
        throw new RateLimitError('Rate limited by TVDB API fetching popular shows.');
      } else {
        throw new UpstreamApiError(`TVDB API error (${status || 'Unknown'}) fetching popular shows: ${error.message}`);
      }
    }
    throw new UpstreamApiError(`Unexpected error fetching popular shows: ${error.message}`);
  }
};

// Placeholder function to get recent shows
export const getRecentShows = async (): Promise<any[]> => {
  console.log('getRecentShows called');
  try {
    const response = await tvdbApi.get(`/series/recent`); // Assuming this endpoint exists
    const rawShows = response.data?.data;

    if (!rawShows || !Array.isArray(rawShows)) {
      throw new NotFoundError('No recent shows found from TVDB, or data format is incorrect.');
    }

    const transformedShows = rawShows
      .map((show: any) => {
        return {
          id: show.id,
          name: show.name || show.seriesName,
          image: show.image || null,
          year: show.year || (show.firstAired ? new Date(show.firstAired).getFullYear().toString() : null),
          overview: show.overview || '',
        };
      })
      .slice(0, 20);

    return transformedShows;
  } catch (error: any) {
    if (error instanceof NotFoundError) throw error;

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        throw new NotFoundError('Recent shows endpoint not found on TVDB.');
      } else if (status === 401 || status === 403) {
        throw new AuthenticationError(`TVDB authentication error (${status}) fetching recent shows. Check API key.`);
      } else if (status === 429) {
        throw new RateLimitError('Rate limited by TVDB API fetching recent shows.');
      } else {
        throw new UpstreamApiError(`TVDB API error (${status || 'Unknown'}) fetching recent shows: ${error.message}`);
      }
    }
    throw new UpstreamApiError(`Unexpected error fetching recent shows: ${error.message}`);
  }
};

// Placeholder function to get top-rated shows
export const getTopRatedShows = async (): Promise<any[]> => {
  console.log('getTopRatedShows called');
  try {
    const response = await tvdbApi.get(`/series/top_rated`); // Assuming this endpoint exists
    const rawShows = response.data?.data;

    if (!rawShows || !Array.isArray(rawShows)) {
      throw new NotFoundError('No top-rated shows found from TVDB, or data format is incorrect.');
    }

    const transformedShows = rawShows
      .map((show: any) => {
        return {
          id: show.id,
          name: show.name || show.seriesName,
          image: show.image || null,
          year: show.year || (show.firstAired ? new Date(show.firstAired).getFullYear().toString() : null),
          overview: show.overview || '',
        };
      })
      .slice(0, 20);

    return transformedShows;
  } catch (error: any) {
    if (error instanceof NotFoundError) throw error;

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        throw new NotFoundError('Top-rated shows endpoint not found on TVDB.');
      } else if (status === 401 || status === 403) {
        throw new AuthenticationError(`TVDB authentication error (${status}) fetching top-rated shows. Check API key.`);
      } else if (status === 429) {
        throw new RateLimitError('Rate limited by TVDB API fetching top-rated shows.');
      } else {
        throw new UpstreamApiError(`TVDB API error (${status || 'Unknown'}) fetching top-rated shows: ${error.message}`);
      }
    }
    throw new UpstreamApiError(`Unexpected error fetching top-rated shows: ${error.message}`);
  }
};

// Placeholder function to get genres
export const getGenres = async (): Promise<string[]> => {
  console.log('getGenres called');
  try {
    const response = await tvdbApi.get(`/genres`);
    // Assuming the response.data.data is an array of genre objects
    // e.g., [{ id: 1, name: "Action", slug: "action" }, ...]
    const rawGenres = response.data?.data;

    if (!rawGenres || !Array.isArray(rawGenres)) {
      throw new NotFoundError('No genres found from TVDB, or data format is incorrect.');
    }

    const transformedGenres = rawGenres
      .map((genre: any) => genre.name)
      .filter(Boolean); // Filter out any null or undefined names

    return transformedGenres;
  } catch (error: any) {
    if (error instanceof NotFoundError) throw error;

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        throw new NotFoundError('Genres endpoint not found on TVDB.');
      } else if (status === 401 || status === 403) {
        throw new AuthenticationError(`TVDB authentication error (${status}) fetching genres. Check API key.`);
      } else if (status === 429) {
        throw new RateLimitError('Rate limited by TVDB API fetching genres.');
      } else {
        throw new UpstreamApiError(`TVDB API error (${status || 'Unknown'}) fetching genres: ${error.message}`);
      }
    }
    throw new UpstreamApiError(`Unexpected error fetching genres: ${error.message}`);
  }
};
