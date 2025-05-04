import axios from "axios";
import { storage } from "./storage";

// TVdb API configuration
const TVDB_API_KEY = process.env.TVDB_API_KEY || "yourtvdbapikey";
const TVDB_API_URL = "https://api.thetvdb.com/v4";
const PIN = process.env.TVDB_PIN || "yourtvdbpin";

let accessToken: string | null = null;
let tokenExpiry: number = 0;

const api = axios.create({
  baseURL: TVDB_API_URL,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Interceptor to add authorization header
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  
  // If we have a valid token, return it
  if (accessToken && tokenExpiry > now) {
    return accessToken;
  }
  
  try {
    // Get a new token
    const response = await axios.post(`${TVDB_API_URL}/login`, {
      apikey: TVDB_API_KEY,
      pin: PIN,
    });
    
    if (response.data?.data?.token) {
      accessToken = response.data.data.token;
      // Token expires in 24 hours, set expiry to 23 hours from now to be safe
      tokenExpiry = now + 23 * 60 * 60 * 1000;
      return accessToken;
    }
    
    throw new Error("Failed to get access token");
  } catch (error) {
    console.error("TVdb auth error:", error);
    throw new Error("TVdb authentication failed");
  }
}

// Simulate TVdb API for development
// This will be replaced with actual API calls when TVDB_API_KEY is available
const mockShows = [
  {
    tvdbId: 81189,
    name: "Breaking Bad",
    overview: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future.",
    status: "Ended",
    firstAired: "2008-01-20",
    network: "AMC",
    runtime: 45,
    image: "https://image.tmdb.org/t/p/w342/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    banner: "https://image.tmdb.org/t/p/original/eSzpy96DwBL3lVSxD1kQcFxiF4z.jpg",
    rating: 9.5,
    genres: ["Crime", "Drama", "Thriller"],
    year: "2008-2013",
  },
  {
    tvdbId: 153021,
    name: "Stranger Things",
    overview: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
    status: "Continuing",
    firstAired: "2016-07-15",
    network: "Netflix",
    runtime: 50,
    image: "https://image.tmdb.org/t/p/w342/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    banner: "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    rating: 8.7,
    genres: ["Drama", "Fantasy", "Horror", "Mystery", "Sci-Fi"],
    year: "2016-Present",
  },
  {
    tvdbId: 94997,
    name: "Game of Thrones",
    overview: "Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.",
    status: "Ended",
    firstAired: "2011-04-17",
    network: "HBO",
    runtime: 60,
    image: "https://image.tmdb.org/t/p/w342/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    banner: "https://image.tmdb.org/t/p/original/suopoADq0k8YZr4dQXcU6pToj6s.jpg",
    rating: 9.3,
    genres: ["Action", "Adventure", "Drama", "Fantasy"],
    year: "2011-2019",
  },
];

const mockSeasons = [
  // Breaking Bad Seasons
  {
    tvdbId: 27272,
    showId: 1,
    number: 1,
    name: "Season 1",
    overview: "The first season of Breaking Bad.",
    image: "https://image.tmdb.org/t/p/w342/1BP4xYv9ZG4ZVHkL7ocOziBbSYH.jpg",
    episodes: 7,
    year: "2008",
  },
  {
    tvdbId: 27273,
    showId: 1,
    number: 2,
    name: "Season 2",
    overview: "The second season of Breaking Bad.",
    image: "https://image.tmdb.org/t/p/w342/aEBmkC5TzRZOx3uWgJFJgK3fUTy.jpg",
    episodes: 13,
    year: "2009",
  },
  {
    tvdbId: 27274,
    showId: 1,
    number: 3,
    name: "Season 3",
    overview: "The third season of Breaking Bad.",
    image: "https://image.tmdb.org/t/p/w342/ffMq69U7vwehCXJLNK8CpWEQZwG.jpg",
    episodes: 13,
    year: "2010",
  },
  {
    tvdbId: 27275,
    showId: 1,
    number: 4,
    name: "Season 4",
    overview: "The fourth season of Breaking Bad.",
    image: "https://image.tmdb.org/t/p/w342/5ewrnKp4OgFZrVkGGJbN7RPYuVv.jpg",
    episodes: 13,
    year: "2011",
  },
  {
    tvdbId: 27276,
    showId: 1,
    number: 5,
    name: "Season 5",
    overview: "The fifth season of Breaking Bad.",
    image: "https://image.tmdb.org/t/p/w342/r3z70vunihrAkjIqQwjubOOiz3A.jpg",
    episodes: 16,
    year: "2012-2013",
  },
];

const mockEpisodes = [
  // Breaking Bad Season 5 Episodes
  {
    tvdbId: 4267640,
    showId: 1,
    seasonId: 5,
    name: "Ozymandias",
    overview: "Everyone copes with radically changed circumstances.",
    seasonNumber: 5,
    episodeNumber: 14,
    firstAired: "2013-09-15",
    runtime: 47,
    image: "https://image.tmdb.org/t/p/w300/2QoAhQw8UvVN6CkKbJNCwM9OUoA.jpg",
    rating: 9.9,
  },
  {
    tvdbId: 4267641,
    showId: 1,
    seasonId: 5,
    name: "Granite State",
    overview: "Events set in motion long ago move toward a conclusion.",
    seasonNumber: 5,
    episodeNumber: 15,
    firstAired: "2013-09-22",
    runtime: 55,
    image: "https://image.tmdb.org/t/p/w300/cmQqRJe5sSZ9DzGnDEeZkYGOfcS.jpg",
    rating: 8.8,
  },
  {
    tvdbId: 4267642,
    showId: 1,
    seasonId: 5,
    name: "Felina",
    overview: "The series finale.",
    seasonNumber: 5,
    episodeNumber: 16,
    firstAired: "2013-09-29",
    runtime: 55,
    image: "https://image.tmdb.org/t/p/w300/pA0YwyhvdDXP3BEGL2grrIhq8aM.jpg",
    rating: 9.9,
  },
];

export const tvdb = {
  async searchShows(query: string) {
    try {
      if (!process.env.TVDB_API_KEY) {
        // Mock response for development
        return mockShows
          .filter(show => show.name.toLowerCase().includes(query.toLowerCase()))
          .map(show => ({
            id: show.tvdbId,
            name: show.name,
            overview: show.overview,
            image: show.image,
            year: show.year,
          }));
      }
      
      const response = await api.get(`/search?query=${encodeURIComponent(query)}&type=series`);
      
      if (!response.data?.data) {
        return [];
      }
      
      return response.data.data.map((item: any) => ({
        id: item.tvdb_id,
        name: item.name,
        overview: item.overview,
        image: item.image_url,
        year: item.year,
      }));
    } catch (error) {
      console.error("TVdb search error:", error);
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
      
      // If not in the database, fetch from TVdb
      let showData;
      
      if (!process.env.TVDB_API_KEY) {
        // Mock response for development
        showData = mockShows.find(s => s.tvdbId === showId);
        
        if (!showData) {
          throw new Error("Show not found");
        }
      } else {
        const response = await api.get(`/series/${showId}`);
        
        if (!response.data?.data) {
          throw new Error("Show not found");
        }
        
        const data = response.data.data;
        
        showData = {
          tvdbId: data.id,
          name: data.name,
          overview: data.overview,
          status: data.status.name,
          firstAired: data.first_aired,
          network: data.network,
          runtime: data.runtime,
          image: data.image_url,
          banner: data.artworks.find((art: any) => art.type === "banner")?.url || null,
          rating: data.score,
          genres: data.genres?.map((g: any) => g.name) || [],
          year: `${new Date(data.first_aired).getFullYear()}${data.status.name === "Ended" ? `-${new Date(data.last_aired).getFullYear()}` : "-Present"}`,
        };
      }
      
      // Save to the database
      show = await storage.saveShow(showData);
      
      return show;
    } catch (error) {
      console.error("TVdb show details error:", error);
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
      
      // If not in the database, fetch from TVdb
      let seasonsData;
      
      if (!process.env.TVDB_API_KEY) {
        // Mock response for development
        seasonsData = mockSeasons
          .filter(s => s.showId === showId)
          .map(s => ({
            tvdbId: s.tvdbId,
            showId: showId,
            number: s.number,
            name: s.name,
            overview: s.overview,
            image: s.image,
            episodes: s.episodes,
            year: s.year,
          }));
      } else {
        const response = await api.get(`/series/${showId}/seasons/extended`);
        
        if (!response.data?.data) {
          return [];
        }
        
        seasonsData = response.data.data
          .filter((season: any) => season.type.name === "Official")
          .map((season: any) => ({
            tvdbId: season.id,
            showId: showId,
            number: season.number,
            name: season.name || `Season ${season.number}`,
            overview: season.overview,
            image: season.image_url,
            episodes: season.episodes?.length || 0,
            year: season.year,
          }));
      }
      
      // Save to the database
      if (seasonsData && seasonsData.length > 0) {
        seasons = await storage.saveSeasons(seasonsData);
      }
      
      return seasons;
    } catch (error) {
      console.error("TVdb seasons error:", error);
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
      
      // If not in the database, fetch from TVdb
      let episodesData;
      
      if (!process.env.TVDB_API_KEY) {
        // Mock response for development
        episodesData = mockEpisodes
          .filter(e => e.showId === showId)
          .map(e => {
            const season = seasons.find(s => s.number === e.seasonNumber);
            return {
              tvdbId: e.tvdbId,
              showId: showId,
              seasonId: season?.id || 0,
              name: e.name,
              overview: e.overview,
              seasonNumber: e.seasonNumber,
              episodeNumber: e.episodeNumber,
              firstAired: e.firstAired,
              runtime: e.runtime,
              image: e.image,
              rating: e.rating,
            };
          });
      } else {
        const response = await api.get(`/series/${showId}/episodes/extended`);
        
        if (!response.data?.data) {
          return [];
        }
        
        episodesData = response.data.data
          .filter((episode: any) => episode.season_number > 0)
          .map((episode: any) => {
            const season = seasons.find(s => s.number === episode.season_number);
            return {
              tvdbId: episode.id,
              showId: showId,
              seasonId: season?.id || 0,
              name: episode.name,
              overview: episode.overview,
              seasonNumber: episode.season_number,
              episodeNumber: episode.number,
              firstAired: episode.aired,
              runtime: episode.runtime,
              image: episode.image_url,
              rating: episode.rating,
            };
          });
      }
      
      // Save to the database
      if (episodesData && episodesData.length > 0) {
        episodes = await storage.saveEpisodes(episodesData);
      }
      
      return episodes;
    } catch (error) {
      console.error("TVdb episodes error:", error);
      return [];
    }
  },
  
  async getCast(showId: number) {
    try {
      if (!process.env.TVDB_API_KEY) {
        // Mock response for development
        return [
          {
            id: 1,
            name: "Bryan Cranston",
            role: "Walter White",
            image: "https://image.tmdb.org/t/p/w185/7Jahy5LZX2Vx65NyEw4XfQ5QIm8.jpg",
          },
          {
            id: 2,
            name: "Aaron Paul",
            role: "Jesse Pinkman",
            image: "https://image.tmdb.org/t/p/w185/pNE9C7ORumsOb4z9oWMMM5biG75.jpg",
          },
          {
            id: 3,
            name: "Anna Gunn",
            role: "Skyler White",
            image: "https://image.tmdb.org/t/p/w185/elhanCo8iMWRokMKcFCYB2iDlVP.jpg",
          },
        ];
      }
      
      const response = await api.get(`/series/${showId}/extended`);
      
      if (!response.data?.data?.characters) {
        return [];
      }
      
      return response.data.data.characters.map((character: any) => ({
        id: character.id,
        name: character.person_name,
        role: character.name,
        image: character.image_url,
      }));
    } catch (error) {
      console.error("TVdb cast error:", error);
      return [];
    }
  },
};
