import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Shows table
export const shows = pgTable("shows", {
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertShowSchema = createInsertSchema(shows);

// Seasons table
export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  tmdbId: integer("tmdb_id").notNull(),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  name: text("name"),
  overview: text("overview"),
  image: text("image"),
  episodes: integer("episodes"),
  year: text("year"),
});

export const insertSeasonSchema = createInsertSchema(seasons);

// Episodes table
export const episodes = pgTable("episodes", {
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
  rating: integer("rating"),
});

export const insertEpisodeSchema = createInsertSchema(episodes);

// User Shows table (tracking)
export const userShows = pgTable("user_shows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("watching"),
  favorite: boolean("favorite").notNull().default(false),
  lastWatched: timestamp("last_watched"),
  progress: integer("progress").notNull().default(0),
  totalEpisodes: integer("total_episodes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserShowSchema = createInsertSchema(userShows);

// User Episodes table (tracking watched episodes)
export const userEpisodes = pgTable("user_episodes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  episodeId: integer("episode_id").notNull().references(() => episodes.id, { onDelete: "cascade" }),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  watchStatus: text("watch_status").notNull().default("unwatched"),
  watchedDate: timestamp("watched_date"),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserEpisodeSchema = createInsertSchema(userEpisodes);

// User Lists table
export const userLists = pgTable("user_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("blue"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserListSchema = createInsertSchema(userLists);

// List Shows table (shows in a list)
export const listShows = pgTable("list_shows", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => userLists.id, { onDelete: "cascade" }),
  showId: integer("show_id").notNull().references(() => shows.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertListShowSchema = createInsertSchema(listShows);

// Relations

export const showsRelations = relations(shows, ({ many }) => ({
  seasons: many(seasons),
  episodes: many(episodes),
  userShows: many(userShows),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  show: one(shows, { fields: [seasons.showId], references: [shows.id] }),
  episodes: many(episodes),
}));

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  show: one(shows, { fields: [episodes.showId], references: [shows.id] }),
  season: one(seasons, { fields: [episodes.seasonId], references: [seasons.id] }),
  userEpisodes: many(userEpisodes),
}));

export const userShowsRelations = relations(userShows, ({ one }) => ({
  user: one(users, { fields: [userShows.userId], references: [users.id] }),
  show: one(shows, { fields: [userShows.showId], references: [shows.id] }),
}));

export const userEpisodesRelations = relations(userEpisodes, ({ one }) => ({
  user: one(users, { fields: [userEpisodes.userId], references: [users.id] }),
  episode: one(episodes, { fields: [userEpisodes.episodeId], references: [episodes.id] }),
  show: one(shows, { fields: [userEpisodes.showId], references: [shows.id] }),
}));

export const userListsRelations = relations(userLists, ({ one, many }) => ({
  user: one(users, { fields: [userLists.userId], references: [users.id] }),
  listShows: many(listShows),
}));

export const listShowsRelations = relations(listShows, ({ one }) => ({
  list: one(userLists, { fields: [listShows.listId], references: [userLists.id] }),
  show: one(shows, { fields: [listShows.showId], references: [shows.id] }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Show = typeof shows.$inferSelect;
export type Season = typeof seasons.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type UserShow = typeof userShows.$inferSelect;
export type UserEpisode = typeof userEpisodes.$inferSelect;
export type UserList = typeof userLists.$inferSelect;
export type ListShow = typeof listShows.$inferSelect;
