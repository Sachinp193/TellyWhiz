var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api/index.ts
import express2 from "express";

// api/db.ts
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
console.log("[DB] Initializing database pool...");
if (process.env.DATABASE_URL) {
  console.log("[DB] DATABASE_URL is defined. Host:", process.env.DATABASE_URL.split("@")[1]?.split(":")[0] || "Not found");
} else {
  console.error("[DB] Error: DATABASE_URL is not defined!");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
    // Required for Supabase connections from Vercel/Node.js to handle SSL certificates.
    // 'rejectUnauthorized: false' is a common setting for development/testing,
    // but for production, consider a more strict SSL configuration if Supabase provides CA certs.
  }
});
pool.on("error", (err) => {
  console.error("[DB] Unexpected error on idle client", err);
  process.exit(1);
});
pool.connect().then((client) => {
  console.log("[DB] Database pool successfully connected and tested (startup).");
  client.release();
}).catch((err) => {
  console.error("[DB] Error connecting to database on startup test:", err.stack);
});
console.log("[DB] Database pool initialization logic complete.");
var db_default = pool;

// api/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  episodes: () => episodes,
  episodesRelations: () => episodesRelations,
  insertEpisodeSchema: () => insertEpisodeSchema,
  insertListShowSchema: () => insertListShowSchema,
  insertSeasonSchema: () => insertSeasonSchema,
  insertShowSchema: () => insertShowSchema,
  insertUserEpisodeSchema: () => insertUserEpisodeSchema,
  insertUserListSchema: () => insertUserListSchema,
  insertUserSchema: () => insertUserSchema,
  insertUserShowSchema: () => insertUserShowSchema,
  listShows: () => listShows,
  listShowsRelations: () => listShowsRelations,
  seasons: () => seasons,
  seasonsRelations: () => seasonsRelations,
  shows: () => shows,
  showsRelations: () => showsRelations,
  userEpisodes: () => userEpisodes,
  userEpisodesRelations: () => userEpisodesRelations,
  userLists: () => userLists,
  userListsRelations: () => userListsRelations,
  userShows: () => userShows,
  userShowsRelations: () => userShowsRelations,
  users: () => users
});
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var shows = pgTable("shows", {
  id: serial("id").primaryKey(),
  tmdbId: integer("tmdb_id").notNull().unique(),
  name: text("name").notNull(),
  overview: text("overview"),
  status: text("status"),
  firstAired: text("first_aired"),
  network: text("network"),
  runtime: integer("runtime"),
  image: text("image"),
  banner: text("banner"),
  rating: integer("rating"),
  genres: text("genres").array(),
  year: text("year"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertShowSchema = createInsertSchema(shows);
var seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  tmdbId: integer("tmdb_id").notNull(),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  name: text("name"),
  overview: text("overview"),
  image: text("image"),
  episodes: integer("episodes"),
  year: text("year")
});
var insertSeasonSchema = createInsertSchema(seasons);
var episodes = pgTable("episodes", {
  id: serial("id").primaryKey(),
  tmdbId: integer("tmdb_id").notNull(),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  seasonId: integer("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  overview: text("overview"),
  seasonNumber: integer("season_number").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  firstAired: text("first_aired"),
  runtime: integer("runtime"),
  image: text("image"),
  rating: integer("rating")
});
var insertEpisodeSchema = createInsertSchema(episodes);
var userShows = pgTable("user_shows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("watching"),
  favorite: boolean("favorite").notNull().default(false),
  lastWatched: timestamp("last_watched"),
  progress: integer("progress").notNull().default(0),
  totalEpisodes: integer("total_episodes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertUserShowSchema = createInsertSchema(userShows);
var userEpisodes = pgTable("user_episodes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  episodeId: integer("episode_id").notNull().references(() => episodes.id, { onDelete: "cascade" }),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  watchStatus: text("watch_status").notNull().default("unwatched"),
  watchedDate: timestamp("watched_date"),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertUserEpisodeSchema = createInsertSchema(userEpisodes);
var userLists = pgTable("user_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("blue"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertUserListSchema = createInsertSchema(userLists);
var listShows = pgTable("list_shows", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => userLists.id, { onDelete: "cascade" }),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertListShowSchema = createInsertSchema(listShows);
var showsRelations = relations(shows, ({ many }) => ({
  seasons: many(seasons),
  episodes: many(episodes),
  userShows: many(userShows)
}));
var seasonsRelations = relations(seasons, ({ one, many }) => ({
  show: one(shows, { fields: [seasons.showId], references: [shows.id] }),
  episodes: many(episodes)
}));
var episodesRelations = relations(episodes, ({ one, many }) => ({
  show: one(shows, { fields: [episodes.showId], references: [shows.id] }),
  season: one(seasons, { fields: [episodes.seasonId], references: [seasons.id] }),
  userEpisodes: many(userEpisodes)
}));
var userShowsRelations = relations(userShows, ({ one }) => ({
  user: one(users, { fields: [userShows.userId], references: [users.id] }),
  show: one(shows, { fields: [userShows.showId], references: [shows.id] })
}));
var userEpisodesRelations = relations(userEpisodes, ({ one }) => ({
  user: one(users, { fields: [userEpisodes.userId], references: [users.id] }),
  episode: one(episodes, { fields: [userEpisodes.episodeId], references: [episodes.id] }),
  show: one(shows, { fields: [userEpisodes.showId], references: [shows.id] })
}));
var userListsRelations = relations(userLists, ({ one, many }) => ({
  user: one(users, { fields: [userLists.userId], references: [users.id] }),
  listShows: many(listShows)
}));
var listShowsRelations = relations(listShows, ({ one }) => ({
  list: one(userLists, { fields: [listShows.listId], references: [userLists.id] }),
  show: one(shows, { fields: [listShows.showId], references: [shows.id] })
}));

// db/index.ts
import { Pool as NeonPoolOriginal, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";
var db;
if (process.env.NODE_ENV === "test") {
  console.log("[db/index.ts] Using pg driver for test environment. DATABASE_URL:", process.env.DATABASE_URL);
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith("postgresql://")) {
    throw new Error("DATABASE_URL for test environment is not set or invalid. Expected format: postgresql://user:password@host:port/database. Received: " + process.env.DATABASE_URL);
  }
  const pgPool = new PgPool({
    connectionString: process.env.DATABASE_URL
  });
  db = drizzlePg(pgPool, { schema: schema_exports });
} else {
  console.log("[db/index.ts] Using neon driver for non-test environment. DATABASE_URL:", process.env.DATABASE_URL);
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL for neon environment is not set.");
  }
  neonConfig.webSocketConstructor = ws;
  const neonPool = new NeonPoolOriginal({ connectionString: process.env.DATABASE_URL });
  const { drizzle: drizzleNeonServerless } = await import("drizzle-orm/neon-serverless");
  db = drizzleNeonServerless(neonPool, { schema: schema_exports });
}

// api/storage.ts
import { eq, and, desc, sql, asc, inArray, isNotNull } from "drizzle-orm";
var storage = {
  // User operations
  getUserByUsername: async (username) => {
    return await db.query.users.findFirst({
      where: eq(users.username, username)
    });
  },
  createUser: async (username, hashedPassword) => {
    const [user] = await db.insert(users).values({
      username,
      password: hashedPassword
    }).returning();
    return user;
  },
  // Show operations
  getShowByTmdbId: async (tmdbId) => {
    return await db.query.shows.findFirst({
      where: eq(shows.tmdbId, tmdbId)
    });
  },
  saveShow: async (showData) => {
    const existingShow = await db.query.shows.findFirst({
      where: eq(shows.tmdbId, showData.tmdbId)
    });
    if (existingShow) {
      const [updatedShow] = await db.update(shows).set({
        name: showData.name,
        overview: showData.overview,
        status: showData.status,
        firstAired: showData.firstAired,
        network: showData.network,
        runtime: showData.runtime,
        image: showData.image,
        banner: showData.banner,
        rating: showData.rating,
        genres: showData.genres,
        year: showData.year,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(shows.id, existingShow.id)).returning();
      return updatedShow;
    } else {
      const [newShow] = await db.insert(shows).values(showData).returning();
      return newShow;
    }
  },
  getShowById: async (id) => {
    return await db.query.shows.findFirst({
      where: eq(shows.id, id)
    });
  },
  // Season operations
  getSeasonsByShowId: async (showId) => {
    return await db.query.seasons.findMany({
      where: eq(seasons.showId, showId),
      orderBy: asc(seasons.number)
    });
  },
  saveSeasons: async (seasonData) => {
    const uniqueSeasons = [];
    const seasonTmdbIds = /* @__PURE__ */ new Set();
    for (const season of seasonData) {
      if (!seasonTmdbIds.has(season.tmdbId)) {
        uniqueSeasons.push(season);
        seasonTmdbIds.add(season.tmdbId);
      }
    }
    if (uniqueSeasons.length === 0) return [];
    const existingSeasons = await db.query.seasons.findMany({
      where: inArray(seasons.tmdbId, uniqueSeasons.map((s) => s.tmdbId))
    });
    const existingTmdbIds = new Set(existingSeasons.map((s) => s.tmdbId));
    const seasonsToCreate = uniqueSeasons.filter((s) => !existingTmdbIds.has(s.tmdbId));
    if (seasonsToCreate.length > 0) {
      return await db.insert(seasons).values(seasonsToCreate).returning();
    }
    return existingSeasons;
  },
  // Episode operations
  getEpisodesByShowId: async (showId) => {
    return await db.query.episodes.findMany({
      where: eq(episodes.showId, showId),
      orderBy: [asc(episodes.seasonNumber), asc(episodes.episodeNumber)]
    });
  },
  saveEpisodes: async (episodeData) => {
    const uniqueEpisodes = [];
    const episodeTmdbIds = /* @__PURE__ */ new Set();
    for (const episode of episodeData) {
      if (!episodeTmdbIds.has(episode.tmdbId)) {
        uniqueEpisodes.push(episode);
        episodeTmdbIds.add(episode.tmdbId);
      }
    }
    if (uniqueEpisodes.length === 0) return [];
    const existingEpisodes = await db.query.episodes.findMany({
      where: inArray(episodes.tmdbId, uniqueEpisodes.map((e) => e.tmdbId))
    });
    const existingTmdbIds = new Set(existingEpisodes.map((e) => e.tmdbId));
    const episodesToCreate = uniqueEpisodes.filter((e) => !existingTmdbIds.has(e.tmdbId));
    if (episodesToCreate.length > 0) {
      return await db.insert(episodes).values(episodesToCreate).returning();
    }
    return existingEpisodes;
  },
  getUserShow: async (userId, showId) => {
    return await db.query.userShows.findFirst({
      where: and(
        eq(userShows.userId, userId),
        eq(userShows.showId, showId)
      )
    });
  },
  trackShow: async (userId, showId) => {
    const totalEpisodes = await db.query.episodes.findMany({
      where: eq(episodes.showId, showId)
    });
    const [userShow] = await db.insert(userShows).values({
      userId,
      showId,
      status: "watching",
      favorite: false,
      progress: 0,
      totalEpisodes: totalEpisodes.length
    }).returning();
    return userShow;
  },
  untrackShow: async (userId, showId) => {
    await db.delete(userShows).where(
      and(
        eq(userShows.userId, userId),
        eq(userShows.showId, showId)
      )
    );
    await db.delete(userEpisodes).where(
      and(
        eq(userEpisodes.userId, userId),
        eq(userEpisodes.showId, showId)
      )
    );
  },
  updateUserShow: async (userId, showId, data) => {
    const [updatedUserShow] = await db.update(userShows).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and(
        eq(userShows.userId, userId),
        eq(userShows.showId, showId)
      )
    ).returning();
    return updatedUserShow;
  },
  getUserShows: async (userId) => {
    const userShowData = await db.query.userShows.findMany({
      where: eq(userShows.userId, userId),
      with: {
        show: true
      }
    });
    return userShowData.map((us) => us.show);
  },
  getUserShowsByStatus: async (userId, status) => {
    const userShowData = await db.query.userShows.findMany({
      where: and(
        eq(userShows.userId, userId),
        eq(userShows.status, status)
      ),
      with: {
        show: true
      }
    });
    return userShowData.map((us) => us.show);
  },
  getUserFavorites: async (userId) => {
    const userShowData = await db.query.userShows.findMany({
      where: and(
        eq(userShows.userId, userId),
        eq(userShows.favorite, true)
      ),
      with: {
        show: true
      }
    });
    return userShowData.map((us) => us.show);
  },
  getUserEpisode: async (userId, episodeId) => {
    return await db.query.userEpisodes.findFirst({
      where: and(
        eq(userEpisodes.userId, userId),
        eq(userEpisodes.episodeId, episodeId)
      )
    });
  },
  setEpisodeWatchStatus: async (userId, episodeId, showId, watchStatus) => {
    const existingUserEpisode = await db.query.userEpisodes.findFirst({
      where: and(
        eq(userEpisodes.userId, userId),
        eq(userEpisodes.episodeId, episodeId)
      )
    });
    if (existingUserEpisode) {
      const [updatedUserEpisode] = await db.update(userEpisodes).set({
        watchStatus,
        watchedDate: watchStatus === "watched" ? /* @__PURE__ */ new Date() : null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(userEpisodes.id, existingUserEpisode.id)).returning();
      await storage.updateShowProgress(userId, showId);
      return updatedUserEpisode;
    } else {
      const [newUserEpisode] = await db.insert(userEpisodes).values({
        userId,
        episodeId,
        showId,
        watchStatus,
        watchedDate: watchStatus === "watched" ? /* @__PURE__ */ new Date() : null
      }).returning();
      await storage.updateShowProgress(userId, showId);
      return newUserEpisode;
    }
  },
  updateShowProgress: async (userId, showId) => {
    const showEpisodes = await db.query.episodes.findMany({
      where: eq(episodes.showId, showId)
    });
    const watchedEpisodes = await db.query.userEpisodes.findMany({
      where: and(
        eq(userEpisodes.userId, userId),
        eq(userEpisodes.showId, showId),
        eq(userEpisodes.watchStatus, "watched")
      )
    });
    const totalEpisodes = showEpisodes.length;
    const watchedCount = watchedEpisodes.length;
    const progress = totalEpisodes > 0 ? Math.floor(watchedCount / totalEpisodes * 100) : 0;
    await db.update(userShows).set({
      progress,
      totalEpisodes,
      lastWatched: watchedEpisodes.length > 0 ? new Date(Math.max(...watchedEpisodes.map((e) => e.watchedDate?.getTime() || 0))) : null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and(
        eq(userShows.userId, userId),
        eq(userShows.showId, showId)
      )
    );
    return { progress, totalEpisodes, watchedCount };
  },
  getSeasonProgress: async (userId, showId) => {
    const allEpisodes = await db.query.episodes.findMany({
      where: eq(episodes.showId, showId)
    });
    const watchedEpisodes = await db.query.userEpisodes.findMany({
      where: and(
        eq(userEpisodes.userId, userId),
        eq(userEpisodes.showId, showId),
        eq(userEpisodes.watchStatus, "watched")
      ),
      with: {
        episode: true
      }
    });
    const seasonProgress = {};
    allEpisodes.forEach((episode) => {
      if (!seasonProgress[episode.seasonNumber]) {
        seasonProgress[episode.seasonNumber] = { watched: 0, total: 0 };
      }
      seasonProgress[episode.seasonNumber].total++;
    });
    watchedEpisodes.forEach((userEpisode) => {
      const seasonNumber = userEpisode.episode.seasonNumber;
      if (seasonProgress[seasonNumber]) {
        seasonProgress[seasonNumber].watched++;
      }
    });
    return seasonProgress;
  },
  // User Lists operations
  getUserLists: async (userId) => {
    return await db.query.userLists.findMany({
      where: eq(userLists.userId, userId),
      orderBy: asc(userLists.name)
    });
  },
  createUserList: async (userId, name, color) => {
    const [list] = await db.insert(userLists).values({
      userId,
      name,
      color
    }).returning();
    return list;
  },
  // --- REVISED POPULAR AND TOP RATED SHOWS AGAIN ---
  getPopularShows: async (limit = 12, genre) => {
    const whereConditions = [];
    if (genre) {
      whereConditions.push(sql`${shows.genres} @> ARRAY[${genre}]::text[]`);
    }
    return await db.select().from(shows).where(whereConditions.length > 0 ? and(...whereConditions) : void 0).limit(limit).orderBy(desc(shows.rating));
  },
  getRecentShows: async (limit = 12) => {
    return await db.select().from(shows).orderBy(desc(shows.firstAired)).limit(limit);
  },
  getTopRatedShows: async (limit = 12, genre) => {
    const whereConditions = [isNotNull(shows.rating)];
    if (genre) {
      whereConditions.push(sql`${shows.genres} @> ARRAY[${genre}]::text[]`);
    }
    return await db.select().from(shows).where(and(...whereConditions)).orderBy(desc(shows.rating)).limit(limit);
  },
  getAllGenres: async () => {
    const result = await db.execute(
      sql`SELECT DISTINCT unnest(genres) as genre FROM shows ORDER BY genre`
    );
    return result.rows.map((row) => row.genre);
  }
};

// api/tvdb.ts
import axios from "axios";
var TMDB_API_KEY = process.env.TVDB_API_KEY;
if (!TMDB_API_KEY) {
  console.error("CRITICAL ERROR: TVDB_API_KEY is not set in environment variables. TVDB API calls will fail.");
}
var TMDB_API_URL = "https://api.themoviedb.org/3";
var TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
var tmdbApiConfig = null;
var dynamicImageBaseUrl = TMDB_IMAGE_BASE_URL;
var api = axios.create({
  baseURL: TMDB_API_URL,
  params: {
    api_key: TMDB_API_KEY
  },
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  }
});
async function getTmdbConfiguration() {
  if (tmdbApiConfig) {
    return tmdbApiConfig;
  }
  try {
    console.log("Fetching TMDB API configuration...");
    const response = await api.get("/configuration");
    tmdbApiConfig = response.data;
    if (tmdbApiConfig.images?.secure_base_url) {
      dynamicImageBaseUrl = tmdbApiConfig.images.secure_base_url;
    } else if (tmdbApiConfig.images?.base_url) {
      dynamicImageBaseUrl = tmdbApiConfig.images.base_url;
    }
    console.log(`TMDB configuration fetched. Image base URL: ${dynamicImageBaseUrl}`);
    return tmdbApiConfig;
  } catch (error) {
    const axiosError = error;
    const status = axiosError.response?.status;
    console.error(`Failed to fetch TMDB configuration${status ? ` with status ${status}` : ""}:`, error);
    console.warn("Using fallback TMDB_IMAGE_BASE_URL due to configuration fetch error.");
    return null;
  }
}
var genreMap = /* @__PURE__ */ new Map([
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
  [37, "Western"]
]);
var tmdbClient = {
  async searchShows(query) {
    await getTmdbConfiguration();
    const endpoint = "/search/tv";
    const queryParams = { query, include_adult: false, language: "en-US", page: 1 };
    console.log(`Calling TMDB API: ${endpoint} with query: ${query}`);
    try {
      const response = await api.get(endpoint, { params: queryParams });
      console.log(`TMDB API call to ${endpoint} succeeded.`);
      if (!response.data?.results) {
        return [];
      }
      return response.data.results.map((item) => ({
        id: item.id,
        name: item.name,
        overview: item.overview,
        image: item.poster_path ? `${dynamicImageBaseUrl}w342${item.poster_path}` : null,
        year: item.first_air_date ? item.first_air_date.substring(0, 4) : "Unknown"
      }));
    } catch (error) {
      const axiosError = error;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ""}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to search shows on TMDB: ${error.message}`);
      }
      throw new Error("Failed to search shows on TMDB due to an unknown error.");
    }
  },
  async getShowDetails(showId) {
    await getTmdbConfiguration();
    const endpoint = `/tv/${showId}`;
    console.log(`Calling TMDB API: ${endpoint}`);
    try {
      let show = await storage.getShowByTmdbId(showId);
      if (show) {
        console.log(`Show details for ID ${showId} found in local storage.`);
        if (show.image && show.image.startsWith(TMDB_IMAGE_BASE_URL)) {
          show.image = show.image.replace(TMDB_IMAGE_BASE_URL, dynamicImageBaseUrl);
        }
        if (show.banner && show.banner.startsWith(TMDB_IMAGE_BASE_URL)) {
          show.banner = show.banner.replace(TMDB_IMAGE_BASE_URL, dynamicImageBaseUrl);
        }
        return show;
      }
      console.log(`Fetching show details for ID ${showId} from TMDB API: ${endpoint}`);
      const response = await api.get(endpoint, {
        params: {
          append_to_response: "external_ids,content_ratings",
          language: "en-US"
        }
      });
      console.log(`TMDB API call to ${endpoint} succeeded.`);
      if (!response.data) {
        throw new Error("Show not found");
      }
      const data = response.data;
      const genres = data.genres.map((g) => {
        return genreMap.get(g.id) || g.name;
      });
      const startYear = data.first_air_date ? new Date(data.first_air_date).getFullYear() : "Unknown";
      const endYear = data.status === "Ended" && data.last_air_date ? new Date(data.last_air_date).getFullYear() : "Present";
      const yearRange = startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
      const showData = {
        tmdbId: data.id,
        name: data.name,
        overview: data.overview,
        status: data.status,
        firstAired: data.first_air_date,
        network: data.networks.length > 0 ? data.networks[0].name : "",
        runtime: data.episode_run_time.length > 0 ? data.episode_run_time[0] : 0,
        image: data.poster_path ? `${dynamicImageBaseUrl}w342${data.poster_path}` : null,
        banner: data.backdrop_path ? `${dynamicImageBaseUrl}original${data.backdrop_path}` : null,
        rating: data.vote_average,
        genres,
        year: yearRange
      };
      show = await storage.saveShow(showData);
      return show;
    } catch (error) {
      const axiosError = error;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ""}:`, error);
      throw new Error("Failed to get show details");
    }
  },
  async getSeasons(showId) {
    await getTmdbConfiguration();
    const baseEndpoint = `/tv/${showId}`;
    console.log(`Attempting to get seasons for show ID ${showId}.`);
    try {
      let seasons2 = await storage.getSeasonsByShowId(showId);
      if (seasons2 && seasons2.length > 0) {
        console.log(`Seasons for show ID ${showId} found in local storage.`);
        seasons2.forEach((s) => {
          if (s.image && s.image.startsWith(TMDB_IMAGE_BASE_URL)) {
            s.image = s.image.replace(TMDB_IMAGE_BASE_URL, dynamicImageBaseUrl);
          }
        });
        return seasons2;
      }
      console.log(`Fetching show (for seasons) for ID ${showId} from TMDB API: ${baseEndpoint}`);
      const response = await api.get(baseEndpoint);
      console.log(`TMDB API call to ${baseEndpoint} (for seasons) succeeded.`);
      if (!response.data?.seasons) {
        return [];
      }
      const seasonsData = await Promise.all(
        response.data.seasons.filter((season) => season.season_number > 0).map(async (season) => {
          const seasonDetailEndpoint = `/tv/${showId}/season/${season.season_number}`;
          console.log(`Calling TMDB API: ${seasonDetailEndpoint}`);
          const seasonResponse = await api.get(seasonDetailEndpoint);
          console.log(`TMDB API call to ${seasonDetailEndpoint} succeeded.`);
          return {
            tmdbId: season.id,
            showId,
            number: season.season_number,
            name: season.name,
            overview: season.overview || "",
            image: season.poster_path ? `${dynamicImageBaseUrl}w342${season.poster_path}` : null,
            episodes: season.episode_count,
            year: season.air_date ? season.air_date.substring(0, 4) : ""
          };
        })
      );
      if (seasonsData && seasonsData.length > 0) {
        seasons2 = await storage.saveSeasons(seasonsData);
      }
      return seasons2;
    } catch (error) {
      const axiosError = error;
      const status = axiosError.response?.status;
      if (axiosError.isAxiosError) {
        console.error(`TMDB API call related to seasons for show ID ${showId} failed${status ? ` with status ${status}` : ""}:`, error);
      } else {
        console.error(`Error in getSeasons for show ID ${showId}:`, error);
      }
      if (error instanceof Error) {
        throw new Error(`Failed to get seasons from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get seasons from TMDB due to an unknown error.");
    }
  },
  async getEpisodes(showId) {
    await getTmdbConfiguration();
    console.log(`Attempting to get episodes for show ID ${showId}.`);
    try {
      let episodes2 = await storage.getEpisodesByShowId(showId);
      if (episodes2 && episodes2.length > 0) {
        console.log(`Episodes for show ID ${showId} found in local storage.`);
        episodes2.forEach((e) => {
          if (e.image && e.image.startsWith(TMDB_IMAGE_BASE_URL)) {
            e.image = e.image.replace(TMDB_IMAGE_BASE_URL, dynamicImageBaseUrl);
          }
        });
        return episodes2;
      }
      const seasons2 = await this.getSeasons(showId);
      if (!seasons2 || seasons2.length === 0) {
        return [];
      }
      const episodesPromises = seasons2.map(async (season) => {
        const endpoint = `/tv/${showId}/season/${season.number}`;
        console.log(`Calling TMDB API: ${endpoint} (for episodes)`);
        const response = await api.get(endpoint);
        console.log(`TMDB API call to ${endpoint} (for episodes) succeeded.`);
        if (!response.data?.episodes) {
          return [];
        }
        return response.data.episodes.map((episode) => {
          return {
            tmdbId: episode.id,
            showId,
            seasonId: season.id,
            // This should be the database ID of the season
            name: episode.name,
            overview: episode.overview || "",
            seasonNumber: episode.season_number,
            episodeNumber: episode.episode_number,
            firstAired: episode.air_date,
            runtime: episode.runtime || 0,
            image: episode.still_path ? `${dynamicImageBaseUrl}w300${episode.still_path}` : null,
            rating: episode.vote_average
          };
        });
      });
      const episodesBySeasons = await Promise.all(episodesPromises);
      const episodesData = episodesBySeasons.flat();
      if (episodesData && episodesData.length > 0) {
        episodes2 = await storage.saveEpisodes(episodesData);
      }
      return episodes2;
    } catch (error) {
      const axiosError = error;
      const status = axiosError.response?.status;
      if (axiosError.isAxiosError) {
        console.error(`TMDB API call related to episodes for show ID ${showId} failed${status ? ` with status ${status}` : ""}:`, error);
      } else {
        console.error(`Error in getEpisodes for show ID ${showId}:`, error);
      }
      if (error instanceof Error) {
        throw new Error(`Failed to get episodes from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get episodes from TMDB due to an unknown error.");
    }
  },
  async getCast(showId) {
    await getTmdbConfiguration();
    const endpoint = `/tv/${showId}/credits`;
    console.log(`Calling TMDB API: ${endpoint}`);
    try {
      const response = await api.get(endpoint);
      console.log(`TMDB API call to ${endpoint} succeeded.`);
      if (!response.data?.cast) {
        return [];
      }
      return response.data.cast.slice(0, 10).map((person) => ({
        id: person.id,
        name: person.name,
        role: person.character,
        image: person.profile_path ? `${dynamicImageBaseUrl}w185${person.profile_path}` : null
      }));
    } catch (error) {
      const axiosError = error;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ""}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get cast from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get cast from TMDB due to an unknown error.");
    }
  },
  async getPopularShowsFromTMDB() {
    await getTmdbConfiguration();
    const endpoint = "/tv/popular";
    const queryParams = { language: "en-US", page: 1 };
    console.log(`Calling TMDB API: ${endpoint} with params: ${JSON.stringify(queryParams)}`);
    try {
      const response = await api.get(endpoint, { params: queryParams });
      console.log(`TMDB API call to ${endpoint} succeeded.`);
      if (!response.data?.results) {
        throw new Error("Invalid response structure from TMDB for popular shows");
      }
      return response.data.results;
    } catch (error) {
      const axiosError = error;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ""}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get popular shows from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get popular shows from TMDB due to an unknown error.");
    }
  },
  async getRecentShowsFromTMDB() {
    await getTmdbConfiguration();
    const endpoint = "/tv/on_the_air";
    const queryParams = { language: "en-US", page: 1 };
    console.log(`Calling TMDB API: ${endpoint} with params: ${JSON.stringify(queryParams)}`);
    try {
      const response = await api.get(endpoint, { params: queryParams });
      console.log(`TMDB API call to ${endpoint} succeeded.`);
      if (!response.data?.results) {
        throw new Error("Invalid response structure from TMDB for recent shows");
      }
      return response.data.results;
    } catch (error) {
      const axiosError = error;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ""}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get recent shows from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get recent shows from TMDB due to an unknown error.");
    }
  },
  async getTopRatedShowsFromTMDB() {
    await getTmdbConfiguration();
    const endpoint = "/tv/top_rated";
    const queryParams = { language: "en-US", page: 1 };
    console.log(`Calling TMDB API: ${endpoint} with params: ${JSON.stringify(queryParams)}`);
    try {
      const response = await api.get(endpoint, { params: queryParams });
      console.log(`TMDB API call to ${endpoint} succeeded.`);
      if (!response.data?.results) {
        throw new Error("Invalid response structure from TMDB for top-rated shows");
      }
      return response.data.results;
    } catch (error) {
      const axiosError = error;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ""}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get top-rated shows from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get top-rated shows from TMDB due to an unknown error.");
    }
  },
  async getGenresFromTMDB() {
    await getTmdbConfiguration();
    const endpoint = "/genre/tv/list";
    const queryParams = { language: "en-US" };
    console.log(`Calling TMDB API: ${endpoint} with params: ${JSON.stringify(queryParams)}`);
    try {
      const response = await api.get(endpoint, { params: queryParams });
      console.log(`TMDB API call to ${endpoint} succeeded.`);
      if (!response.data?.genres) {
        throw new Error("Invalid response structure from TMDB for genres");
      }
      return response.data.genres.map((genre) => genre.name);
    } catch (error) {
      const axiosError = error;
      const status = axiosError.response?.status;
      console.error(`TMDB API call to ${endpoint} failed${status ? ` with status ${status}` : ""}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to get genres from TMDB: ${error.message}`);
      }
      throw new Error("Failed to get genres from TMDB due to an unknown error.");
    }
  }
};

// api/routes.ts
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt"; // <---------------- THE CULPRIT IS HERE!
import { eq as eq2 } from "drizzle-orm";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import pgSessionConnect from "connect-pg-simple";
var isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const PgSession = pgSessionConnect(session);
  app2.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: "session",
        createTableIfMissing: true
      }),
      secret: process.env.SESSION_SECRET || "series-track-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1e3
        // 30 days
      }
    })
  );
  app2.use(passport.initialize());
  app2.use(passport.session());
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
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq2(users.id, id)
      });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
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
  app2.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.json({ message: "Login successful" });
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logout successful" });
    });
  });
  app2.get("/api/auth/user", (req, res) => {
    if (req.user) {
      const user = req.user;
      return res.json({
        id: user.id,
        username: user.username
      });
    }
    return res.status(401).json({ message: "Not authenticated" });
  });
  app2.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Query must be at least 2 characters" });
      }
      const results = await tmdbClient.searchShows(query);
      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Failed to search shows" });
    }
  });
  app2.get("/api/shows/:id", async (req, res) => {
    try {
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      const show = await tmdbClient.getShowDetails(showId);
      if (!show) {
        return res.status(404).json({ message: "Show not found" });
      }
      res.json(show);
    } catch (error) {
      console.error("Show details error:", error);
      res.status(500).json({ message: "Failed to get show details" });
    }
  });
  app2.get("/api/shows/:id/seasons", async (req, res) => {
    try {
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      const seasons2 = await tmdbClient.getSeasons(showId);
      res.json(seasons2);
    } catch (error) {
      console.error("Seasons error:", error);
      res.status(500).json({ message: "Failed to get seasons" });
    }
  });
  app2.get("/api/shows/:id/episodes", async (req, res) => {
    try {
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      let episodes2 = await tmdbClient.getEpisodes(showId);
      if (req.user) {
        const userId = req.user.id;
        const userEpisodesResult = await db.query.userEpisodes.findMany({
          where: eq2(userEpisodes.userId, userId),
          with: {
            episode: true
          }
        });
        const watchStatusMap = /* @__PURE__ */ new Map();
        userEpisodesResult.forEach((ue) => {
          watchStatusMap.set(ue.episodeId, ue.watchStatus);
        });
        episodes2 = episodes2.map((episode) => ({
          ...episode,
          watchStatus: watchStatusMap.get(episode.id) || "unwatched"
        }));
      }
      res.json(episodes2);
    } catch (error) {
      console.error("Episodes error:", error);
      res.status(500).json({ message: "Failed to get episodes" });
    }
  });
  app2.get("/api/shows/:id/cast", async (req, res) => {
    try {
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      const cast = await tmdbClient.getCast(showId);
      res.json(cast);
    } catch (error) {
      console.error("Cast error:", error);
      res.status(500).json({ message: "Failed to get cast" });
    }
  });
  app2.get("/api/shows/popular", async (req, res) => {
    try {
      const existingShows = await storage.getPopularShows(5);
      if (existingShows && existingShows.length > 0) {
        const genre = req.query.genre;
        const shows3 = await storage.getPopularShows(12, genre);
        return res.json(shows3);
      }
      const popularDataResults = await tmdbClient.getPopularShowsFromTMDB();
      const shows2 = await Promise.all(
        popularDataResults.slice(0, 12).map(async (show) => {
          const details = await tmdbClient.getShowDetails(show.id);
          return details;
        })
      );
      return res.json(shows2);
    } catch (error) {
      console.error("Popular shows error:", error);
      res.status(500).json({ message: "Failed to get popular shows" });
    }
  });
  app2.get("/api/shows/recent", async (req, res) => {
    try {
      const existingShows = await storage.getRecentShows(5);
      if (existingShows && existingShows.length > 0) {
        const shows3 = await storage.getRecentShows(12);
        return res.json(shows3);
      }
      const airingDataResults = await tmdbClient.getRecentShowsFromTMDB();
      const shows2 = await Promise.all(
        airingDataResults.slice(0, 12).map(async (show) => {
          const details = await tmdbClient.getShowDetails(show.id);
          return details;
        })
      );
      return res.json(shows2);
    } catch (error) {
      console.error("Recent shows error:", error);
      res.status(500).json({ message: "Failed to get recent shows" });
    }
  });
  app2.get("/api/shows/top-rated", async (req, res) => {
    try {
      const existingShows = await storage.getTopRatedShows(5);
      if (existingShows && existingShows.length > 0) {
        const genre = req.query.genre;
        const shows3 = await storage.getTopRatedShows(12, genre);
        return res.json(shows3);
      }
      const topRatedDataResults = await tmdbClient.getTopRatedShowsFromTMDB();
      const shows2 = await Promise.all(
        topRatedDataResults.slice(0, 12).map(async (show) => {
          const details = await tmdbClient.getShowDetails(show.id);
          return details;
        })
      );
      return res.json(shows2);
    } catch (error) {
      console.error("Top rated shows error:", error);
      res.status(500).json({ message: "Failed to get top rated shows" });
    }
  });
  app2.get("/api/genres", async (req, res) => {
    try {
      const dbGenres = await storage.getAllGenres();
      if (dbGenres && dbGenres.length > 0) {
        return res.json(dbGenres);
      }
      const genres = await tmdbClient.getGenresFromTMDB();
      return res.json(genres);
    } catch (error) {
      console.error("Genres error:", error);
      res.status(500).json({ message: "Failed to get genres" });
    }
  });
  app2.get("/api/user/shows", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const shows2 = await storage.getUserShows(userId);
      res.json(shows2);
    } catch (error) {
      console.error("User shows error:", error);
      res.status(500).json({ message: "Failed to get user shows" });
    }
  });
  app2.get("/api/user/shows/watching", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const shows2 = await storage.getUserShowsByStatus(userId, "watching");
      res.json(shows2);
    } catch (error) {
      console.error("User watching shows error:", error);
      res.status(500).json({ message: "Failed to get watching shows" });
    }
  });
  app2.get("/api/user/favorites", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const shows2 = await storage.getUserFavorites(userId);
      res.json(shows2);
    } catch (error) {
      console.error("User favorites error:", error);
      res.status(500).json({ message: "Failed to get favorites" });
    }
  });
  app2.get("/api/user/shows/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
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
  app2.post("/api/user/shows/:id/track", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      const showExists = await tmdbClient.getShowDetails(showId);
      if (!showExists) {
        return res.status(404).json({ message: "Show not found, cannot track" });
      }
      const userShow = await storage.trackShow(userId, showId);
      res.json(userShow);
    } catch (error) {
      console.error("Track show error:", error);
      res.status(500).json({ message: "Failed to track show" });
    }
  });
  app2.delete("/api/user/shows/:id/track", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      const showExists = await tmdbClient.getShowDetails(showId);
      if (!showExists) {
        return res.status(404).json({ message: "Show not found, cannot untrack" });
      }
      await storage.untrackShow(userId, showId);
      res.json({ message: "Show untracked successfully" });
    } catch (error) {
      console.error("Untrack show error:", error);
      res.status(500).json({ message: "Failed to untrack show" });
    }
  });
  app2.patch("/api/user/shows/:id/favorite", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      const favoriteSchema = z.object({
        favorite: z.boolean()
      });
      const { favorite } = favoriteSchema.parse(req.body);
      const showExists = await tmdbClient.getShowDetails(showId);
      if (!showExists) {
        return res.status(404).json({ message: "Show not found, cannot update favorite status" });
      }
      const userShowExists = await storage.getUserShow(userId, showId);
      if (!userShowExists) {
        return res.status(404).json({ message: "User is not tracking this show, cannot update favorite status" });
      }
      const userShow = await storage.updateUserShow(userId, showId, { favorite });
      if (!userShow) {
        return res.status(404).json({ message: "Failed to update favorite status, user show not found after update." });
      }
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
  app2.get("/api/shows/:id/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) {
        return res.status(400).json({ message: "Invalid show ID" });
      }
      const progress = await storage.getSeasonProgress(userId, showId);
      if (progress === null) {
        return res.status(404).json({ message: "Show progress not found for this user and show" });
      }
      res.json(progress);
    } catch (error) {
      console.error("Show progress error:", error);
      res.status(500).json({ message: "Failed to get show progress" });
    }
  });
  app2.patch("/api/episodes/watch-status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const watchStatusSchema = z.object({
        episodeId: z.number(),
        showId: z.number(),
        watchStatus: z.enum(["watched", "unwatched", "in-progress"])
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
  app2.get("/api/lists", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const lists = await storage.getUserLists(userId);
      res.json(lists);
    } catch (error) {
      console.error("User lists error:", error);
      res.status(500).json({ message: "Failed to get user lists" });
    }
  });
  app2.post("/api/lists", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const listSchema = z.object({
        name: z.string().min(1, "List name is required"),
        color: z.string().default("blue")
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

// api/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  root: "./client",
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@db": path.resolve(import.meta.dirname, "db"),
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});

// api/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    // --- FIX IS HERE ---
    allowedHosts: true
    // Change 'true' to 'true as const' or just use 'true' (literal)
    // ------------------
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// api/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.get("/api/test-db", async (req, res) => {
  try {
    const client = await db_default.connect();
    const result = await client.query("SELECT NOW() as current_time");
    client.release();
    console.log(
      `Successfully connected to database: ${db_default.options.database} at ${db_default.options.host}:${db_default.options.port}. Current time: ${result.rows[0].current_time}`
    );
    res.json({ message: "Database connected!", time: result.rows[0].current_time });
  } catch (err) {
    console.error(
      `Error connecting to database: ${db_default.options.database} at ${db_default.options.host}:${db_default.options.port}. Error: ${err.message}`,
      err.stack
    );
    res.status(500).json({ message: "Failed to connect to database", error: err.message });
  }
});
app.post("/api/users/:userId/series", async (req, res) => {
  const { userId } = req.params;
  const { tvSeriesName, status } = req.body;
  if (!tvSeriesName || !status) {
    return res.status(400).json({ message: "TV series name and status are required." });
  }
  let client;
  try {
    client = await db_default.connect();
    const query = `
      INSERT INTO user_tv_series (user_id, tv_series_name, status, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *;
    `;
    const result = await client.query(query, [userId, tvSeriesName, status]);
    client.release();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (client) client.release();
    console.error("Error adding TV series:", err.message);
    res.status(500).json({ message: "Failed to add TV series", error: err.message });
  }
});
app.use((req, res, next) => {
  console.log(`[API] Request received: ${req.method} ${req.path}`);
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (process.env.NODE_ENV === "test") {
  } else if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT || 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
var index_default = app;
export {
  index_default as default
};
