import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js"; // Added .js
// import { tvdbClient } from "./tvdb"; // Renamed for consistency
import * as tvdbClient from './tvdb.js'; // Added .js
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { db } from "@db";
import * as schema from "@shared/schema"; // Changed to alias
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import pgSessionConnect from "connect-pg-simple";
import { NotFoundError, UpstreamApiError, AuthenticationError, RateLimitError } from './errors'; // Added .js

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
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
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
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser(username, hashedPassword);
      
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
      
      const results = await tvdbClient.searchShows(query);
      res.json(results);
    } catch (error: any) {
      console.error(`Error in /api/search for query "${req.query.q}":`, error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message || "Search results not found." });
      } else if (error instanceof AuthenticationError) {
        return res.status(502).json({ message: error.message || "Upstream authentication issue with data provider." });
      } else if (error instanceof RateLimitError) {
        return res.status(502).json({ message: error.message || "Upstream rate limit exceeded. Please try again later." });
      } else if (error instanceof UpstreamApiError) {
        return res.status(502).json({ message: error.message || "Failed to search shows due to an upstream issue." });
      } else if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      return res.status(500).json({ message: "Failed to search shows due to an internal server error." });
    }
  });
  
  // Show details APIs
  app.get("/api/shows/:id", async (req, res) => {
    try {
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      const show = await tvdbClient.getShowDetails(showId);
      res.json(show);
    } catch (error: any) {
      console.error(`Error in /api/shows/:id for ID ${req.params.id}:`, error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message || "Show not found" });
      } else if (error instanceof AuthenticationError) {
        return res.status(502).json({ message: error.message || "Upstream authentication issue with data provider." });
      } else if (error instanceof RateLimitError) {
        return res.status(502).json({ message: error.message || "Upstream rate limit exceeded. Please try again later." });
      } else if (error instanceof UpstreamApiError) {
        return res.status(502).json({ message: error.message || "Failed to get show details due to an upstream issue." });
      } else if (error instanceof ZodError) { 
        const formattedError = fromZodError(error); 
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      return res.status(500).json({ message: "Failed to get show details due to an internal server error." });
    }
  });
  
  app.get("/api/shows/:id/seasons", async (req, res) => {
    try {
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      const seasons = await tvdbClient.getSeasons(showId);
      res.json(seasons);
    } catch (error: any) {
      console.error(`Error in /api/shows/:id/seasons for ID ${req.params.id}:`, error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message || "Seasons not found for this show." });
      } else if (error instanceof AuthenticationError) {
        return res.status(502).json({ message: error.message || "Upstream authentication issue with data provider." });
      } else if (error instanceof RateLimitError) {
        return res.status(502).json({ message: error.message || "Upstream rate limit exceeded. Please try again later." });
      } else if (error instanceof UpstreamApiError) {
        return res.status(502).json({ message: error.message || "Failed to get seasons due to an upstream issue." });
      } else if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      return res.status(500).json({ message: "Failed to get seasons due to an internal server error." });
    }
  });
  
  app.get("/api/shows/:id/episodes", async (req, res) => {
    try {
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      let episodes = await tvdbClient.getEpisodes(showId);
      
      // If the user is authenticated, include watch status
      if (req.user) {
        const userId = (req.user as any).id;
        const userEpisodesResult = await db.query.userEpisodes.findMany({
          where: and(
            eq(schema.userEpisodes.userId, userId),
            eq(schema.userEpisodes.showId, showId) // showId is already parsed as int
          ),
          with: {
            episode: true, // Kept for ue.episodeId, though ue.episode might not be strictly needed if episode.id is used for map
          },
        });
        
        const watchStatusMap = new Map();
        userEpisodesResult.forEach((ue: any) => {
          watchStatusMap.set(ue.episodeId, ue.watchStatus);
        });
        
        episodes = episodes.map((episode: any) => ({
          ...episode,
          watchStatus: watchStatusMap.get(episode.id) || "unwatched",
        }));
      }
      
      res.json(episodes);
    } catch (error: any) {
      console.error(`Error in /api/shows/:id/episodes for ID ${req.params.id}:`, error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message || "Episodes not found for this show." });
      } else if (error instanceof AuthenticationError) {
        return res.status(502).json({ message: error.message || "Upstream authentication issue with data provider." });
      } else if (error instanceof RateLimitError) {
        return res.status(502).json({ message: error.message || "Upstream rate limit exceeded. Please try again later." });
      } else if (error instanceof UpstreamApiError) {
        return res.status(502).json({ message: error.message || "Failed to get episodes due to an upstream issue." });
      } else if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      return res.status(500).json({ message: "Failed to get episodes due to an internal server error." });
    }
  });
  
  app.get("/api/shows/:id/cast", async (req, res) => {
    try {
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      const cast = await tvdbClient.getCast(showId);
      res.json(cast);
    } catch (error: any) {
      console.error(`Error in /api/shows/:id/cast for ID ${req.params.id}:`, error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message || "Cast not found for this show." });
      } else if (error instanceof AuthenticationError) {
        return res.status(502).json({ message: error.message || "Upstream authentication issue with data provider." });
      } else if (error instanceof RateLimitError) {
        return res.status(502).json({ message: error.message || "Upstream rate limit exceeded. Please try again later." });
      } else if (error instanceof UpstreamApiError) {
        return res.status(502).json({ message: error.message || "Failed to get cast due to an upstream issue." });
      } else if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      return res.status(500).json({ message: "Failed to get cast due to an internal server error." });
    }
  });
  
  // Popular & Discovery APIs
  app.get("/api/shows/popular", async (req, res) => {
    try {
      // 1. Fetch initial list from TVDB (summaries)
      const popularDataSummaries = await tvdbClient.getPopularShows();

      // 2. Fetch full details for each show
      // TODO: N+1 Query Pattern: The following block makes a separate API call for each show
      // to get its full details. This is due to limitations in the TVDB API's list endpoints,
      // which do not provide all necessary details (e.g., genres, status, rating) in a single call,
      // and a batch show details endpoint is not confirmed to be available/suitable.
      // This will be slow if popularDataSummaries is large.
      const detailedShowsFromTvdb = await Promise.all(
        popularDataSummaries.slice(0, 12).map(async (showSummary: any) => {
          // Assuming getShowDetails is needed for full data.
          return await tvdbClient.getShowDetails(showSummary.id);
        })
      );

      // 3. Save/Update each detailed show in the local database
      for (const showData of detailedShowsFromTvdb) {
        if (showData) { // Ensure showData is not null (e.g., if getShowDetails failed for one)
          await storage.saveShow(showData);
        }
      }

      // 4. Serve the final list from the database
      const genre = req.query.genre as string | undefined;
      const finalShowsToReturn = await storage.getPopularShows(12, genre);
      res.json(finalShowsToReturn);

    } catch (error: any) {
      console.error("Error in /api/shows/popular:", error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message || "Popular shows not found." });
      } else if (error instanceof AuthenticationError) {
        return res.status(502).json({ message: error.message || "Upstream authentication issue with data provider." });
      } else if (error instanceof RateLimitError) {
        return res.status(502).json({ message: error.message || "Upstream rate limit exceeded. Please try again later." });
      } else if (error instanceof UpstreamApiError) {
        return res.status(502).json({ message: error.message || "Failed to get popular shows due to an upstream issue." });
      } else if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      return res.status(500).json({ message: "Failed to get popular shows due to an internal server error." });
    }
  });
  
  app.get("/api/shows/recent", async (req, res) => {
    try {
      // 1. Fetch initial list from TVDB (summaries)
      const recentDataSummaries = await tvdbClient.getRecentShows();

      // 2. Fetch full details for each show
      // TODO: N+1 Query Pattern: Similar to the popular shows endpoint.
      const detailedShowsFromTvdb = await Promise.all(
        recentDataSummaries.slice(0, 12).map(async (showSummary: any) => {
          return await tvdbClient.getShowDetails(showSummary.id);
        })
      );

      // 3. Save/Update each detailed show in the local database
      for (const showData of detailedShowsFromTvdb) {
        if (showData) {
          await storage.saveShow(showData);
        }
      }

      // 4. Serve the final list from the database
      const finalShowsToReturn = await storage.getRecentShows(12);
      res.json(finalShowsToReturn);

    } catch (error: any) {
      console.error("Error in /api/shows/recent:", error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message || "Recent shows not found." });
      } else if (error instanceof AuthenticationError) {
        return res.status(502).json({ message: error.message || "Upstream authentication issue with data provider." });
      } else if (error instanceof RateLimitError) {
        return res.status(502).json({ message: error.message || "Upstream rate limit exceeded. Please try again later." });
      } else if (error instanceof UpstreamApiError) {
        return res.status(502).json({ message: error.message || "Failed to get recent shows due to an upstream issue." });
      } else if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      return res.status(500).json({ message: "Failed to get recent shows due to an internal server error." });
    }
  });
  
  app.get("/api/shows/top-rated", async (req, res) => {
    try {
      // 1. Fetch initial list from TVDB (summaries)
      const topRatedDataSummaries = await tvdbClient.getTopRatedShows();

      // 2. Fetch full details for each show
      // TODO: N+1 Query Pattern: Similar to the popular shows endpoint.
      const detailedShowsFromTvdb = await Promise.all(
        topRatedDataSummaries.slice(0, 12).map(async (showSummary: any) => {
          return await tvdbClient.getShowDetails(showSummary.id);
        })
      );

      // 3. Save/Update each detailed show in the local database
      for (const showData of detailedShowsFromTvdb) {
        if (showData) {
          await storage.saveShow(showData);
        }
      }

      // 4. Serve the final list from the database
      const genre = req.query.genre as string | undefined;
      const finalShowsToReturn = await storage.getTopRatedShows(12, genre);
      res.json(finalShowsToReturn);

    } catch (error: any) {
      console.error("Error in /api/shows/top-rated:", error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message || "Top-rated shows not found." });
      } else if (error instanceof AuthenticationError) {
        return res.status(502).json({ message: error.message || "Upstream authentication issue with data provider." });
      } else if (error instanceof RateLimitError) {
        return res.status(502).json({ message: error.message || "Upstream rate limit exceeded. Please try again later." });
      } else if (error instanceof UpstreamApiError) {
        return res.status(502).json({ message: error.message || "Failed to get top-rated shows due to an upstream issue." });
      } else if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      return res.status(500).json({ message: "Failed to get top-rated shows due to an internal server error." });
    }
  });
  
  app.get("/api/genres", async (req, res) => {
    try {
      // First check if we have genres in the database
      const dbGenres = await storage.getAllGenres();
      if (dbGenres && dbGenres.length > 0) {
        return res.json(dbGenres);
      }
      
      // If not, fetch from TVDB
      const genres = await tvdbClient.getGenres();
      return res.json(genres);
    } catch (error: any) {
      console.error("Error in /api/genres:", error);

      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message || "Genres not found." });
      } else if (error instanceof AuthenticationError) {
        return res.status(502).json({ message: error.message || "Upstream authentication issue with data provider." });
      } else if (error instanceof RateLimitError) {
        return res.status(502).json({ message: error.message || "Upstream rate limit exceeded. Please try again later." });
      } else if (error instanceof UpstreamApiError) {
        return res.status(502).json({ message: error.message || "Failed to get genres due to an upstream issue." });
      } else if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      return res.status(500).json({ message: "Failed to get genres due to an internal server error." });
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
      if (!userShow) {
        return res.status(404).json({ message: "User show association not found" });
      }
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
      
      // Verify the show exists before attempting to track
      const showDetailsFromTvdb = await tvdbClient.getShowDetails(showId);
      // getShowDetails throws NotFoundError if not found, so no need for !showExists check here.
      // The error will be caught by the generic error handler for the route.

      // Before tracking, ensure show, seasons, and episodes are in the local DB
      // 1. Save the show details first (this also ensures the show is in our DB)
      // storage.saveShow is an upsert operation.
      await storage.saveShow({
        tvdbId: showDetailsFromTvdb.id, // Ensure field name matches schema expectation if different from tvdbClient
        name: showDetailsFromTvdb.name,
        overview: showDetailsFromTvdb.overview,
        status: showDetailsFromTvdb.status,
        firstAired: showDetailsFromTvdb.year, // Or firstAired if tvdbClient provides it directly
        network: showDetailsFromTvdb.network, // Assuming network is available
        runtime: showDetailsFromTvdb.runtime, // Assuming runtime is available
        image: showDetailsFromTvdb.image,
        banner: showDetailsFromTvdb.banner,
        rating: showDetailsFromTvdb.rating,
        genres: showDetailsFromTvdb.genres,
        year: showDetailsFromTvdb.year,
      });
      
      // 2. Fetch and Save Seasons
      const seasonsFromTvdb = await tvdbClient.getSeasons(showId);
      const seasonsToSave = seasonsFromTvdb.map((s: any) => ({
        tvdbId: s.id,
        showId: showId, // showId here is the TVDB ID of the show
        number: s.number,
        name: s.name,
        overview: s.overview,
        image: s.image,
        episodes: s.episodeCount, 
        year: s.year,
      }));

      const savedSeasons = await storage.saveSeasons(seasonsToSave);
      const seasonNumberToDbIdMap = new Map<number, number>();
      savedSeasons.forEach((s: schema.Season) => {
        // storage.saveSeasons returns an array of seasons as they are in the DB, including their DB `id` and `number`.
        // Ensure `s.number` and `s.id` are correct based on `storage.saveSeasons` return type.
        // Also, ensure s.number and s.id are not null before using them.
        if (s.number !== null && s.id !== null) { // Check for null directly
            seasonNumberToDbIdMap.set(s.number, s.id);
        }
      });

      // 3. Fetch and Save Episodes
      const episodesFromTvdb = await tvdbClient.getEpisodes(showId);
      const episodesToSave = episodesFromTvdb.map((ep: any) => {
        const dbSeasonId = seasonNumberToDbIdMap.get(ep.seasonNumber);
        if (dbSeasonId === undefined) {
          console.warn(`Could not find DB seasonId for show ${showId}, TVDB season number ${ep.seasonNumber}. Skipping episode TVDB ID ${ep.id}`);
          return null; 
        }
        return {
          tvdbId: ep.id,
          showId: showId, // showId here is the TVDB ID of the show
          seasonId: dbSeasonId, 
          name: ep.name,
          overview: ep.overview,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber, 
          firstAired: ep.aired,
          runtime: ep.runtime,
          image: ep.image,
        };
      }).filter(Boolean); 

      if (episodesToSave.length > 0) {
        await storage.saveEpisodes(episodesToSave as any[]); 
      }
      
      // 4. Now, track the show for the user.
      // storage.trackShow calculates totalEpisodes based on episodes in DB for this showId.
      const userShow = await storage.trackShow(userId, showId);
      res.json(userShow);
    } catch (error: any) {
      console.error(`Error in /api/user/shows/:id/track for ID ${req.params.id}:`, error);

      if (error instanceof NotFoundError) { // This would be from getShowDetails
        return res.status(404).json({ message: error.message || "Show not found, cannot track." });
      } else if (error instanceof AuthenticationError) {
        return res.status(502).json({ message: error.message || "Upstream authentication issue with data provider." });
      } else if (error instanceof RateLimitError) {
        return res.status(502).json({ message: error.message || "Upstream rate limit exceeded. Please try again later." });
      } else if (error instanceof UpstreamApiError) {
        return res.status(502).json({ message: error.message || "Failed to track show due to an upstream issue." });
      } else if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      return res.status(500).json({ message: "Failed to track show due to an internal server error." });
    }
  });
  
  app.delete("/api/user/shows/:id/track", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const showId = parseInt(req.params.id);
      
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      
      const showExists = await tvdbClient.getShowDetails(showId);
      // No explicit check for !showExists as getShowDetails will throw NotFoundError
      
      await storage.untrackShow(userId, showId);
      res.json({ message: "Show untracked successfully" });
    } catch (error: any) {
      console.error(`Error in /api/user/shows/:id/track (DELETE) for ID ${req.params.id}:`, error);

      if (error instanceof NotFoundError) { // This would be from getShowDetails
        return res.status(404).json({ message: error.message || "Show not found, cannot untrack." });
      } else if (error instanceof AuthenticationError) {
        return res.status(502).json({ message: error.message || "Upstream authentication issue with data provider." });
      } else if (error instanceof RateLimitError) {
        return res.status(502).json({ message: error.message || "Upstream rate limit exceeded. Please try again later." });
      } else if (error instanceof UpstreamApiError) {
        return res.status(502).json({ message: error.message || "Failed to untrack show due to an upstream issue." });
      } else if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      return res.status(500).json({ message: "Failed to untrack show due to an internal server error." });
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
      
      // Verify the show exists by calling getShowDetails (it will throw if not found)
      await tvdbClient.getShowDetails(showId); 

      // Also, ensure the user is tracking the show before favoriting
      const userShowExists = await storage.getUserShow(userId, showId);
      if (!userShowExists) {
        // This is a valid application-level "not found" for the user's tracking of the show
        return res.status(404).json({ message: "User is not tracking this show, cannot update favorite status." });
      }
      
      const userShow = await storage.updateUserShow(userId, showId, { favorite });
      // Assuming updateUserShow would throw or return error for DB issues, not for "not found" as that's checked.
      res.json(userShow);
    } catch (error: any) {
      console.error(`Error in /api/user/shows/:id/favorite for ID ${req.params.id}:`, error);

      if (error instanceof NotFoundError) { // From getShowDetails if show itself doesn't exist
        return res.status(404).json({ message: error.message || "Show not found, cannot update favorite status." });
      } else if (error instanceof AuthenticationError) {
        return res.status(502).json({ message: error.message || "Upstream authentication issue with data provider." });
      } else if (error instanceof RateLimitError) {
        return res.status(502).json({ message: error.message || "Upstream rate limit exceeded. Please try again later." });
      } else if (error instanceof UpstreamApiError) {
        return res.status(502).json({ message: error.message || "Failed to update favorite status due to an upstream issue." });
      } else if (error instanceof ZodError) {
        const formattedError = fromZodError(error);
        return res.status(400).json({ message: "Invalid input", errors: formattedError.details });
      }
      // Default fallback for other types of errors (e.g., database errors from storage.updateUserShow)
      return res.status(500).json({ message: "Failed to update favorite status due to an internal server error." });
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
      // Assuming getSeasonProgress returns null if the show isn't tracked or found for the user
      if (progress === null) { 
        return res.status(404).json({ message: "Show progress not found for this user and show" });
      }
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
