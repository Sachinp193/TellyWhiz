import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { tvdb } from "./tmdb";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import pgSessionConnect from "connect-pg-simple";

// Auth middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Configure session
  const PgSession = pgSessionConnect(session);
  
  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "series-track-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );
  
  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, id),
      });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = schema.insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      const user = await storage.createUser(username, password);
      
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        return res.status(201).json({ message: "Registration successful" });
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      return res.status(500).json({ message: "Registration failed" });
    }
  });
  
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.json({ message: "Login successful" });
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logout successful" });
    });
  });
  
  app.get("/api/auth/user", (req, res) => {
    if (req.user) {
      const user = req.user as any;
      return res.json({
        id: user.id,
        username: user.username,
      });
    }
    return res.status(401).json({ message: "Not authenticated" });
  });
  
  // Search API
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Query must be at least 2 characters" });
      }
      
      const results = await tvdb.searchShows(query);
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Failed to search shows" });
    }
  });
  
  // Show details APIs
  app.get("/api/shows/:id", async (req, res) => {
    try {
      const showId = parseInt(req.params.id);
      
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      
      const show = await tvdb.getShowDetails(showId);
      res.json(show);
    } catch (error) {
      console.error("Show details error:", error);
      res.status(500).json({ message: "Failed to get show details" });
    }
  });
  
  app.get("/api/shows/:id/seasons", async (req, res) => {
    try {
      const showId = parseInt(req.params.id);
      
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      
      const seasons = await tvdb.getSeasons(showId);
      res.json(seasons);
    } catch (error) {
      console.error("Seasons error:", error);
      res.status(500).json({ message: "Failed to get seasons" });
    }
  });
  
  app.get("/api/shows/:id/episodes", async (req, res) => {
    try {
      const showId = parseInt(req.params.id);
      
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      
      let episodes = await tvdb.getEpisodes(showId);
      
      // If the user is authenticated, include watch status
      if (req.user) {
        const userId = (req.user as any).id;
        const userEpisodesResult = await db.query.userEpisodes.findMany({
          where: eq(schema.userEpisodes.userId, userId),
          with: {
            episode: true,
          },
        });
        
        const watchStatusMap = new Map();
        userEpisodesResult.forEach((ue: any) => {
          watchStatusMap.set(ue.episodeId, ue.watchStatus);
        });
        
        episodes = episodes.map(episode => ({
          ...episode,
          watchStatus: watchStatusMap.get(episode.id) || "unwatched",
        }));
      }
      
      res.json(episodes);
    } catch (error) {
      console.error("Episodes error:", error);
      res.status(500).json({ message: "Failed to get episodes" });
    }
  });
  
  app.get("/api/shows/:id/cast", async (req, res) => {
    try {
      const showId = parseInt(req.params.id);
      
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      
      const cast = await tvdb.getCast(showId);
      res.json(cast);
    } catch (error) {
      console.error("Cast error:", error);
      res.status(500).json({ message: "Failed to get cast" });
    }
  });
  
  // Popular & Discovery APIs
  app.get("/api/shows/popular", async (req, res) => {
    try {
      // Check if we have shows in the database
      const existingShows = await storage.getPopularShows(5);
      if (existingShows && existingShows.length > 0) {
        const genre = req.query.genre as string | undefined;
        const shows = await storage.getPopularShows(12, genre);
        return res.json(shows);
      }
      
      // If no shows in database, fetch them from TMDB
      const popularResponse = await fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`);
      const popularData = await popularResponse.json();
      
      if (!popularData.results) {
        return res.status(500).json({ message: "Failed to get shows from TMDB" });
      }
      
      // Process and save each show
      const shows = await Promise.all(
        popularData.results.slice(0, 12).map(async (show: any) => {
          // Get additional details
          const details = await tvdb.getShowDetails(show.id);
          return details;
        })
      );
      
      return res.json(shows);
    } catch (error) {
      console.error("Popular shows error:", error);
      res.status(500).json({ message: "Failed to get popular shows" });
    }
  });
  
  app.get("/api/shows/recent", async (req, res) => {
    try {
      // Check if we have shows in the database
      const existingShows = await storage.getRecentShows(5);
      if (existingShows && existingShows.length > 0) {
        const shows = await storage.getRecentShows(12);
        return res.json(shows);
      }
      
      // If no shows in database, fetch them from TMDB
      const airingResponse = await fetch(
        `https://api.themoviedb.org/3/tv/on_the_air?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`
      );
      const airingData = await airingResponse.json();
      
      if (!airingData.results) {
        return res.status(500).json({ message: "Failed to get shows from TMDB" });
      }
      
      // Process and save each show
      const shows = await Promise.all(
        airingData.results.slice(0, 12).map(async (show: any) => {
          // Get additional details
          const details = await tvdb.getShowDetails(show.id);
          return details;
        })
      );
      
      return res.json(shows);
    } catch (error) {
      console.error("Recent shows error:", error);
      res.status(500).json({ message: "Failed to get recent shows" });
    }
  });
  
  app.get("/api/shows/top-rated", async (req, res) => {
    try {
      // Check if we have shows in the database
      const existingShows = await storage.getTopRatedShows(5);
      if (existingShows && existingShows.length > 0) {
        const genre = req.query.genre as string | undefined;
        const shows = await storage.getTopRatedShows(12, genre);
        return res.json(shows);
      }
      
      // If no shows in database, fetch them from TMDB
      const topRatedResponse = await fetch(
        `https://api.themoviedb.org/3/tv/top_rated?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`
      );
      const topRatedData = await topRatedResponse.json();
      
      if (!topRatedData.results) {
        return res.status(500).json({ message: "Failed to get shows from TMDB" });
      }
      
      // Process and save each show
      const shows = await Promise.all(
        topRatedData.results.slice(0, 12).map(async (show: any) => {
          // Get additional details
          const details = await tvdb.getShowDetails(show.id);
          return details;
        })
      );
      
      return res.json(shows);
    } catch (error) {
      console.error("Top rated shows error:", error);
      res.status(500).json({ message: "Failed to get top rated shows" });
    }
  });
  
  app.get("/api/genres", async (req, res) => {
    try {
      // First check if we have genres in the database
      const dbGenres = await storage.getAllGenres();
      if (dbGenres && dbGenres.length > 0) {
        return res.json(dbGenres);
      }
      
      // If not, fetch from TMDB
      const genresResponse = await fetch(
        `https://api.themoviedb.org/3/genre/tv/list?api_key=${process.env.TMDB_API_KEY}&language=en-US`
      );
      const genresData = await genresResponse.json();
      
      if (!genresData.genres) {
        return res.status(500).json({ message: "Failed to get genres from TMDB" });
      }
      
      // Map to our format
      const genres = genresData.genres.map((genre: any) => genre.name);
      
      return res.json(genres);
    } catch (error) {
      console.error("Genres error:", error);
      res.status(500).json({ message: "Failed to get genres" });
    }
  });
  
  // User data APIs (require authentication)
  app.get("/api/user/shows", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const shows = await storage.getUserShows(userId);
      res.json(shows);
    } catch (error) {
      console.error("User shows error:", error);
      res.status(500).json({ message: "Failed to get user shows" });
    }
  });
  
  app.get("/api/user/shows/watching", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const shows = await storage.getUserShowsByStatus(userId, "watching");
      res.json(shows);
    } catch (error) {
      console.error("User watching shows error:", error);
      res.status(500).json({ message: "Failed to get watching shows" });
    }
  });
  
  app.get("/api/user/favorites", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const shows = await storage.getUserFavorites(userId);
      res.json(shows);
    } catch (error) {
      console.error("User favorites error:", error);
      res.status(500).json({ message: "Failed to get favorites" });
    }
  });
  
  app.get("/api/user/shows/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const showId = parseInt(req.params.id);
      
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      
      const userShow = await storage.getUserShow(userId, showId);
      res.json(userShow);
    } catch (error) {
      console.error("User show error:", error);
      res.status(500).json({ message: "Failed to get user show" });
    }
  });
  
  app.post("/api/user/shows/:id/track", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const showId = parseInt(req.params.id);
      
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      
      const userShow = await storage.trackShow(userId, showId);
      res.json(userShow);
    } catch (error) {
      console.error("Track show error:", error);
      res.status(500).json({ message: "Failed to track show" });
    }
  });
  
  app.delete("/api/user/shows/:id/track", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const showId = parseInt(req.params.id);
      
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      
      await storage.untrackShow(userId, showId);
      res.json({ message: "Show untracked successfully" });
    } catch (error) {
      console.error("Untrack show error:", error);
      res.status(500).json({ message: "Failed to untrack show" });
    }
  });
  
  app.patch("/api/user/shows/:id/favorite", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const showId = parseInt(req.params.id);
      
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      
      const favoriteSchema = z.object({
        favorite: z.boolean(),
      });
      
      const { favorite } = favoriteSchema.parse(req.body);
      
      const userShow = await storage.updateUserShow(userId, showId, { favorite });
      res.json(userShow);
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      console.error("Favorite show error:", error);
      res.status(500).json({ message: "Failed to update favorite status" });
    }
  });
  
  app.get("/api/shows/:id/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const showId = parseInt(req.params.id);
      
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      
      const progress = await storage.getSeasonProgress(userId, showId);
      res.json(progress);
    } catch (error) {
      console.error("Show progress error:", error);
      res.status(500).json({ message: "Failed to get show progress" });
    }
  });
  
  app.patch("/api/episodes/watch-status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      const watchStatusSchema = z.object({
        episodeId: z.number(),
        showId: z.number(),
        watchStatus: z.enum(["watched", "unwatched", "in-progress"]),
      });
      
      const { episodeId, showId, watchStatus } = watchStatusSchema.parse(req.body);
      
      const userEpisode = await storage.setEpisodeWatchStatus(
        userId,
        episodeId,
        showId,
        watchStatus
      );
      
      res.json(userEpisode);
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      console.error("Watch status error:", error);
      res.status(500).json({ message: "Failed to update watch status" });
    }
  });
  
  app.get("/api/lists", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const lists = await storage.getUserLists(userId);
      res.json(lists);
    } catch (error) {
      console.error("User lists error:", error);
      res.status(500).json({ message: "Failed to get user lists" });
    }
  });
  
  app.post("/api/lists", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      const listSchema = z.object({
        name: z.string().min(1, "List name is required"),
        color: z.string().default("blue"),
      });
      
      const { name, color } = listSchema.parse(req.body);
      
      const list = await storage.createUserList(userId, name, color);
      res.status(201).json(list);
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      console.error("Create list error:", error);
      res.status(500).json({ message: "Failed to create list" });
    }
  });
  
  return httpServer;
}
