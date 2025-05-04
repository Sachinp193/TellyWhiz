import axios from "axios";
import { storage } from "./storage";

// TMDB API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
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
export const tvdb = {
  async searchShows(query: string) {
    try {
      const response = await api.get(`/search/tv`, {
        params: {
          query: query,
          include_adult: false,
          language: "en-US",
          page: 1,
        },
      });
      
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
      console.error("TMDB search error:", error);
      return [];
    }
  },
  
  async getShowDetails(showId: number) {
    try {
      // First check if show exists in our database
      let show = await storage.getShowByTvdbId(showId);
      
      if (show) {
        return show;
      }
      
      // If not in the database, fetch from TMDB
      const response = await api.get(`/tv/${showId}`, {
        params: {
          append_to_response: "external_ids,content_ratings",
          language: "en-US",
        },
      });
      
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
      console.error("TMDB show details error:", error);
      throw new Error("Failed to get show details");
    }
  },
  
  async getSeasons(showId: number) {
    try {
      // First check if seasons exist in our database
      let seasons = await storage.getSeasonsByShowId(showId);
      
      if (seasons && seasons.length > 0) {
        return seasons;
      }
      
      // If not in the database, fetch from TMDB
      const response = await api.get(`/tv/${showId}`);
      
      if (!response.data?.seasons) {
        return [];
      }
      
      const seasonsData = await Promise.all(
        response.data.seasons
          .filter((season: any) => season.season_number > 0) // Skip specials season (0)
          .map(async (season: any) => {
            // Get additional season details
            const seasonResponse = await api.get(`/tv/${showId}/season/${season.season_number}`);
            
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
      console.error("TMDB seasons error:", error);
      return [];
    }
  },
  
  async getEpisodes(showId: number) {
    try {
      // First check if episodes exist in our database
      let episodes = await storage.getEpisodesByShowId(showId);
      
      if (episodes && episodes.length > 0) {
        return episodes;
      }
      
      // Need to make sure we have seasons first
      const seasons = await this.getSeasons(showId);
      
      if (!seasons || seasons.length === 0) {
        return [];
      }
      
      // Fetch episodes for each season
      const episodesPromises = seasons.map(async (season) => {
        const response = await api.get(`/tv/${showId}/season/${season.number}`);
        
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
      console.error("TMDB episodes error:", error);
      return [];
    }
  },
  
  async getCast(showId: number) {
    try {
      const response = await api.get(`/tv/${showId}/credits`);
      
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
      console.error("TMDB cast error:", error);
      return [];
    }
  },
};