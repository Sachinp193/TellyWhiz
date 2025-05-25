import axios, { AxiosError } from "axios";
import { storage } from "./storage";
import { log } from "./vite"; // Assuming 'log' is a suitable logger, or replace with console.log

// TMDB API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error("CRITICAL ERROR: TMDB_API_KEY is not set in environment variables. TMDB API calls will fail.");
}
const TMDB_API_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

const api = axios.create({
  baseURL: TMDB_API_URL,
  params: {
    api_key: TMDB_API_KEY,
  },
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Map TMDB genres to our database genres
const genreMap = new Map([
  [28, "Action"],
  [12, "Adventure"],
  [16, "Animation"],
  [35, "Comedy"],
  [80, "Crime"],
  [99, "Documentary"],
  [18, "Drama"],
  [10751, "Family"],
  [14, "Fantasy"],
  [36, "History"],
  [27, "Horror"],
  [10402, "Music"],
  [9648, "Mystery"],
  [10749, "Romance"],
  [878, "Sci-Fi"],
  [10770, "TV Movie"],
  [53, "Thriller"],
  [10752, "War"],
  [37, "Western"],
]);

// Simulate TVDB API for development using TMDB API
export const tmdbClient = {
  async searchShows(query: string) {
    const endpoint = "/search/tv";
    const queryParams = { query, include_adult: false, language: "en-US", page: 1 };
    log(`Calling TMDB API: ${endpoint} with query: ${query}`);
    try {
      const response = await api.get(endpoint, { params: queryParams });
      log(`TMDB API call to ${endpoint} succeeded.`);
      
      if (!response.data?.results) {
        return [];
      }
      
      return response.data.results.map((item: any) => ({
        id: item.id,
        name: item.name,
        overview: item.overview,
        image: item.poster_path ? `${TMDB_IMAGE_BASE_URL}/w342${item.poster_path}` : null,
        year: item.first_air_date ? item.first_air_date.substring(0, 4) : "Unknown",
      }));
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ''}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to search shows on TMDB: ${error.message}`);
      }
      throw new Error("Failed to search shows on TMDB due to an unknown error.");
    }
  },
  
  async getShowDetails(showId: number) {
    const endpoint = `/tv/${showId}`;
    log(`Calling TMDB API: ${endpoint}`);
    try {
      // First check if show exists in our database
      let show = await storage.getShowByTvdbId(showId);
      
      if (show) {
        log(`Show details for ID ${showId} found in local storage.`);
        return show;
      }
      
      // If not in the database, fetch from TMDB
      log(`Fetching show details for ID ${showId} from TMDB API: ${endpoint}`);
      const response = await api.get(endpoint, {
        params: {
          append_to_response: "external_ids,content_ratings",
          language: "en-US",
        },
      });
      log(`TMDB API call to ${endpoint} succeeded.`);
      
      if (!response.data) {
        throw new Error("Show not found");
      }
      
      const data = response.data;
      
      // Map TMDB genre IDs to our genre names
      const genres = data.genres.map((g: any) => {
        return genreMap.get(g.id) || g.name;
      });
      
      // Create year range based on show status
      const startYear = data.first_air_date ? new Date(data.first_air_date).getFullYear() : "Unknown";
      const endYear = data.status === "Ended" && data.last_air_date 
        ? new Date(data.last_air_date).getFullYear() 
        : "Present";
      const yearRange = startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
      
      const showData = {
        tvdbId: data.id,
        name: data.name,
        overview: data.overview,
        status: data.status,
        firstAired: data.first_air_date,
        network: data.networks.length > 0 ? data.networks[0].name : "",
        runtime: data.episode_run_time.length > 0 ? data.episode_run_time[0] : 0,
        image: data.poster_path ? `${TMDB_IMAGE_BASE_URL}/w342${data.poster_path}` : null,
        banner: data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/original${data.backdrop_path}` : null,
        rating: data.vote_average,
        genres: genres,
        year: yearRange,
      };
      
      // Save to the database
      show = await storage.saveShow(showData);
      
      return show;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ''}:`, error);
      throw new Error("Failed to get show details");
    }
  },
  
  async getSeasons(showId: number) {
    const baseEndpoint = `/tv/${showId}`;
    log(`Attempting to get seasons for show ID ${showId}.`);
    try {
      // First check if seasons exist in our database
      let seasons = await storage.getSeasonsByShowId(showId);
      
      if (seasons && seasons.length > 0) {
        log(`Seasons for show ID ${showId} found in local storage.`);
        return seasons;
      }
      
      // If not in the database, fetch from TMDB
      log(`Fetching show (for seasons) for ID ${showId} from TMDB API: ${baseEndpoint}`);
      const response = await api.get(baseEndpoint);
      log(`TMDB API call to ${baseEndpoint} (for seasons) succeeded.`);
      
      if (!response.data?.seasons) {
        return [];
      }
      
      const seasonsData = await Promise.all(
        response.data.seasons
          .filter((season: any) => season.season_number > 0) // Skip specials season (0)
          .map(async (season: any) => {
            const seasonDetailEndpoint = `/tv/${showId}/season/${season.season_number}`;
            log(`Calling TMDB API: ${seasonDetailEndpoint}`);
            // Get additional season details
            const seasonResponse = await api.get(seasonDetailEndpoint);
            log(`TMDB API call to ${seasonDetailEndpoint} succeeded.`);
            
            return {
              tvdbId: season.id,
              showId: showId,
              number: season.season_number,
              name: season.name,
              overview: season.overview || "",
              image: season.poster_path ? `${TMDB_IMAGE_BASE_URL}/w342${season.poster_path}` : null,
              episodes: season.episode_count,
              year: season.air_date ? season.air_date.substring(0, 4) : "",
            };
          })
      );
      
      // Save to the database
      if (seasonsData && seasonsData.length > 0) {
        seasons = await storage.saveSeasons(seasonsData);
      }
      
      return seasons;
    } catch (error) {
      // Error logging for getSeasons happens per-call if it's an API call, 
      // or this will catch other errors (e.g. storage)
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      // Check if it's an Axios error to determine if it's an API call failure
      if (axiosError.isAxiosError) {
        console.error(`TMDB API call related to seasons for show ID ${showId} failed${status ? ` with status ${status}` : ''}:`, error);
      } else {
        console.error(`Error in getSeasons for show ID ${showId}:`, error);
      }
      if (error instanceof Error) {
        throw new Error(`Failed to get seasons from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get seasons from TMDB due to an unknown error.");
    }
  },
  
  async getEpisodes(showId: number) {
    log(`Attempting to get episodes for show ID ${showId}.`);
    try {
      // First check if episodes exist in our database
      let episodes = await storage.getEpisodesByShowId(showId);
      
      if (episodes && episodes.length > 0) {
        log(`Episodes for show ID ${showId} found in local storage.`);
        return episodes;
      }
      
      // Need to make sure we have seasons first
      const seasons = await this.getSeasons(showId); // getSeasons has its own logging
      
      if (!seasons || seasons.length === 0) {
        return [];
      }
      
      // Fetch episodes for each season
      const episodesPromises = seasons.map(async (season) => {
        const endpoint = `/tv/${showId}/season/${season.number}`;
        log(`Calling TMDB API: ${endpoint} (for episodes)`);
        const response = await api.get(endpoint);
        log(`TMDB API call to ${endpoint} (for episodes) succeeded.`);
        
        if (!response.data?.episodes) {
          return [];
        }
        
        return response.data.episodes.map((episode: any) => {
          return {
            tvdbId: episode.id,
            showId: showId,
            seasonId: season.id,
            name: episode.name,
            overview: episode.overview || "",
            seasonNumber: episode.season_number,
            episodeNumber: episode.episode_number,
            firstAired: episode.air_date,
            runtime: episode.runtime || 0,
            image: episode.still_path ? `${TMDB_IMAGE_BASE_URL}/w300${episode.still_path}` : null,
            rating: episode.vote_average,
          };
        });
      });
      
      const episodesBySeasons = await Promise.all(episodesPromises);
      const episodesData = episodesBySeasons.flat();
      
      // Save to the database
      if (episodesData && episodesData.length > 0) {
        episodes = await storage.saveEpisodes(episodesData);
      }
      
      return episodes;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      // Similar to getSeasons, check if it's an API call failure
      if (axiosError.isAxiosError) {
        console.error(`TMDB API call related to episodes for show ID ${showId} failed${status ? ` with status ${status}` : ''}:`, error);
      } else {
        console.error(`Error in getEpisodes for show ID ${showId}:`, error);
      }
      if (error instanceof Error) {
        throw new Error(`Failed to get episodes from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get episodes from TMDB due to an unknown error.");
    }
  },
  
  async getCast(showId: number) {
    const endpoint = `/tv/${showId}/credits`;
    log(`Calling TMDB API: ${endpoint}`);
    try {
      const response = await api.get(endpoint);
      log(`TMDB API call to ${endpoint} succeeded.`);
      
      if (!response.data?.cast) {
        return [];
      }
      
      return response.data.cast.slice(0, 10).map((person: any) => ({
        id: person.id,
        name: person.name,
        role: person.character,
        image: person.profile_path ? `${TMDB_IMAGE_BASE_URL}/w185${person.profile_path}` : null,
      }));
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ''}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get cast from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get cast from TMDB due to an unknown error.");
    }
  },

  async getPopularShowsFromTMDB() {
    const endpoint = "/tv/popular";
    const queryParams = { language: "en-US", page: 1 };
    log(`Calling TMDB API: ${endpoint} with params: ${JSON.stringify(queryParams)}`);
    try {
      const response = await api.get(endpoint, { params: queryParams });
      log(`TMDB API call to ${endpoint} succeeded.`);
      if (!response.data?.results) {
        throw new Error("Invalid response structure from TMDB for popular shows");
      }
      return response.data.results;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ''}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get popular shows from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get popular shows from TMDB due to an unknown error.");
    }
  },

  async getRecentShowsFromTMDB() {
    const endpoint = "/tv/on_the_air";
    const queryParams = { language: "en-US", page: 1 };
    log(`Calling TMDB API: ${endpoint} with params: ${JSON.stringify(queryParams)}`);
    try {
      const response = await api.get(endpoint, { params: queryParams });
      log(`TMDB API call to ${endpoint} succeeded.`);
      if (!response.data?.results) {
        throw new Error("Invalid response structure from TMDB for recent shows");
      }
      return response.data.results;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ''}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get recent shows from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get recent shows from TMDB due to an unknown error.");
    }
  },

  async getTopRatedShowsFromTMDB() {
    const endpoint = "/tv/top_rated";
    const queryParams = { language: "en-US", page: 1 };
    log(`Calling TMDB API: ${endpoint} with params: ${JSON.stringify(queryParams)}`);
    try {
      const response = await api.get(endpoint, { params: queryParams });
      log(`TMDB API call to ${endpoint} succeeded.`);
      if (!response.data?.results) {
        throw new Error("Invalid response structure from TMDB for top-rated shows");
      }
      return response.data.results;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ''}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get top-rated shows from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get top-rated shows from TMDB due to an unknown error.");
    }
  },

  async getGenresFromTMDB() {
    const endpoint = "/genre/tv/list";
    const queryParams = { language: "en-US" };
    log(`Calling TMDB API: ${endpoint} with params: ${JSON.stringify(queryParams)}`);
    try {
      const response = await api.get(endpoint, { params: queryParams });
      log(`TMDB API call to ${endpoint} succeeded.`);
      if (!response.data?.genres) {
        throw new Error("Invalid response structure from TMDB for genres");
      }
      // Map to our format (array of names)
      return response.data.genres.map((genre: any) => genre.name);
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ''}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get genres from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get genres from TMDB due to an unknown error.");
    }
  },
};