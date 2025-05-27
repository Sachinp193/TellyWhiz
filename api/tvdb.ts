import axios, { AxiosInstance } from 'axios';

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
    // TVDB search endpoint (/search) often returns a flat array in `response.data.data`
    // Each object in the array represents a search result.
    const rawResults = response.data?.data;

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
    console.error(`Error fetching shows from TVDB for query "${query}":`, error.message);
    return []; // Return empty array on error
  }
};

// Placeholder function to get show details
export const getShowDetails = async (showId: number | string): Promise<any | null> => {
  console.log(`getShowDetails called with showId: ${showId}`);
  try {
    const response = await tvdbApi.get(`/series/${showId}`);
    const rawData = response.data?.data; // Assuming TVDB wraps data in a 'data' property

    if (!rawData || !rawData.id || !rawData.name) {
      console.error(`Essential data missing for showId ${showId} from TVDB.`);
      return null;
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
    console.error(`Error fetching show details from TVDB for showId ${showId}:`, error.message);
    return null; // Return null on error
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
      console.error(`No seasons data found or data is not an array for showId ${showId} from TVDB.`);
      return [];
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
    console.error(`Error fetching seasons from TVDB for showId ${showId}:`, error.message);
    return []; // Return empty array on error
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
      console.error(`No episodes data found or data is not an array for showId ${showId} from TVDB.`);
      return [];
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
    console.error(`Error fetching episodes from TVDB for showId ${showId}:`, error.message);
    return []; // Return empty array on error
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
      console.error(`No cast data found or data is not an array for showId ${showId} from TVDB.`);
      return [];
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
    console.error(`Error fetching cast from TVDB for showId ${showId}:`, error.message);
    return []; // Return empty array on error
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
      console.error('No popular shows data found or data is not an array from TVDB.');
      return [];
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
    console.error('Error fetching popular shows from TVDB:', error.message);
    return []; // Return empty array on error
  }
};

// Placeholder function to get recent shows
export const getRecentShows = async (): Promise<any[]> => {
  console.log('getRecentShows called');
  try {
    const response = await tvdbApi.get(`/series/recent`); // Assuming this endpoint exists
    const rawShows = response.data?.data;

    if (!rawShows || !Array.isArray(rawShows)) {
      console.error('No recent shows data found or data is not an array from TVDB.');
      return [];
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
    console.error('Error fetching recent shows from TVDB:', error.message);
    return [];
  }
};

// Placeholder function to get top-rated shows
export const getTopRatedShows = async (): Promise<any[]> => {
  console.log('getTopRatedShows called');
  try {
    const response = await tvdbApi.get(`/series/top_rated`); // Assuming this endpoint exists
    const rawShows = response.data?.data;

    if (!rawShows || !Array.isArray(rawShows)) {
      console.error('No top-rated shows data found or data is not an array from TVDB.');
      return [];
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
    console.error('Error fetching top-rated shows from TVDB:', error.message);
    return [];
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
      console.error('No genres data found or data is not an array from TVDB.');
      return [];
    }

    const transformedGenres = rawGenres
      .map((genre: any) => genre.name)
      .filter(Boolean); // Filter out any null or undefined names

    return transformedGenres;
  } catch (error: any) {
    console.error('Error fetching genres from TVDB:', error.message);
    return []; // Return empty array on error
  }
};
