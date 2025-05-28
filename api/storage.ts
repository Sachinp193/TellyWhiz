import { db } from "@db";
import { eq, and, desc, sql, isNull, asc, ne, or, inArray, isNotNull } from "drizzle-orm";
import {
  users,
  shows,
  seasons,
  episodes,
  userShows,
  userEpisodes,
  userLists,
  listShows,
} from "@shared/schema";

export const storage = {
  // User operations
  getUserByUsername: async (username: string) => {
    return await db.query.users.findFirst({
      where: eq(users.username, username),
    });
  },

  createUser: async (username: string, hashedPassword: string) => {
    const [user] = await db.insert(users).values({
      username,
      password: hashedPassword,
    }).returning();
    return user;
  },

  // Show operations
  getShowByTvdbId: async (tvdbId: number) => {
    return await db.query.shows.findFirst({
      where: eq(shows.tvdbId, tvdbId),
    });
  },

  saveShow: async (showData: any) => {
    const existingShow = await db.query.shows.findFirst({
      where: eq(shows.tvdbId, showData.tvdbId),
    });

    if (existingShow) {
      const [updatedShow] = await db.update(shows)
        .set({
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
          updatedAt: new Date(),
        })
        .where(eq(shows.id, existingShow.id))
        .returning();
      return updatedShow;
    } else {
      const [newShow] = await db.insert(shows).values(showData).returning();
      return newShow;
    }
  },

  getShowById: async (id: number) => {
    return await db.query.shows.findFirst({
      where: eq(shows.id, id),
    });
  },

  // Season operations
  getSeasonsByShowId: async (showId: number) => {
    return await db.query.seasons.findMany({
      where: eq(seasons.showId, showId),
      orderBy: asc(seasons.number),
    });
  },

  saveSeasons: async (seasonData: any[]) => {
    const uniqueSeasons: any[] = [];
    const seasonTvdbIds = new Set();

    for (const season of seasonData) {
      if (!seasonTvdbIds.has(season.tvdbId)) {
        uniqueSeasons.push(season);
        seasonTvdbIds.add(season.tvdbId);
      }
    }

    if (uniqueSeasons.length === 0) return [];

    const existingSeasons = await db.query.seasons.findMany({
      where: inArray(seasons.tvdbId, uniqueSeasons.map((s: any) => s.tvdbId)),
    });

    const existingTvdbIds = new Set(existingSeasons.map((s: any) => s.tvdbId));

    const seasonsToCreate = uniqueSeasons.filter((s: any) => !existingTvdbIds.has(s.tvdbId));

    if (seasonsToCreate.length > 0) {
      return await db.insert(seasons).values(seasonsToCreate).returning();
    }

    return existingSeasons;
  },

  // Episode operations
  getEpisodesByShowId: async (showId: number) => {
    return await db.query.episodes.findMany({
      where: eq(episodes.showId, showId),
      orderBy: [asc(episodes.seasonNumber), asc(episodes.episodeNumber)],
    });
  },

  saveEpisodes: async (episodeData: any[]) => {
    const uniqueEpisodes: any[] = [];
    const episodeTvdbIds = new Set();

    for (const episode of episodeData) {
      if (!episodeTvdbIds.has(episode.tvdbId)) {
        uniqueEpisodes.push(episode);
        episodeTvdbIds.add(episode.tvdbId);
      }
    }

    if (uniqueEpisodes.length === 0) return [];

    const existingEpisodes = await db.query.episodes.findMany({
      where: inArray(episodes.tvdbId, uniqueEpisodes.map((e: any) => e.tvdbId)),
    });

    const existingTvdbIds = new Set(existingEpisodes.map((e: any) => e.tvdbId));

    const episodesToCreate = uniqueEpisodes.filter((e: any) => !existingTvdbIds.has(e.tvdbId));

    if (episodesToCreate.length > 0) {
      return await db.insert(episodes).values(episodesToCreate).returning();
    }

    return existingEpisodes;
  },

  getUserShow: async (userId: number, showId: number) => {
    return await db.query.userShows.findFirst({
      where: and(
        eq(userShows.userId, userId),
        eq(userShows.showId, showId)
      ),
    });
  },

  trackShow: async (userId: number, showId: number) => {
    const totalEpisodes = await db.query.episodes.findMany({
      where: eq(episodes.showId, showId),
    });

    const [userShow] = await db.insert(userShows).values({
      userId,
      showId,
      status: "watching",
      favorite: false,
      progress: 0,
      totalEpisodes: totalEpisodes.length,
    }).returning();

    return userShow;
  },

  untrackShow: async (userId: number, showId: number) => {
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

  updateUserShow: async (userId: number, showId: number, data: any) => {
    const [updatedUserShow] = await db.update(userShows)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userShows.userId, userId),
          eq(userShows.showId, showId)
        )
      )
      .returning();

    return updatedUserShow;
  },

  getUserShows: async (userId: number) => {
    const userShowData = await db.query.userShows.findMany({
      where: eq(userShows.userId, userId),
      with: {
        show: true,
      },
    });

    return userShowData.map((us: any) => us.show);
  },

  getUserShowsByStatus: async (userId: number, status: string) => {
    const userShowData = await db.query.userShows.findMany({
      where: and(
        eq(userShows.userId, userId),
        eq(userShows.status, status)
      ),
      with: {
        show: true,
      },
    });

    return userShowData.map((us: any) => us.show);
  },

  getUserFavorites: async (userId: number) => {
    const userShowData = await db.query.userShows.findMany({
      where: and(
        eq(userShows.userId, userId),
        eq(userShows.favorite, true)
      ),
      with: {
        show: true,
      },
    });

    return userShowData.map((us: any) => us.show);
  },

  getUserEpisode: async (userId: number, episodeId: number) => {
    return await db.query.userEpisodes.findFirst({
      where: and(
        eq(userEpisodes.userId, userId),
        eq(userEpisodes.episodeId, episodeId)
      ),
    });
  },

  setEpisodeWatchStatus: async (userId: number, episodeId: number, showId: number, watchStatus: string) => {
    const existingUserEpisode = await db.query.userEpisodes.findFirst({
      where: and(
        eq(userEpisodes.userId, userId),
        eq(userEpisodes.episodeId, episodeId)
      ),
    });

    if (existingUserEpisode) {
      const [updatedUserEpisode] = await db.update(userEpisodes)
        .set({
          watchStatus,
          watchedDate: watchStatus === "watched" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(userEpisodes.id, existingUserEpisode.id))
        .returning();

      await storage.updateShowProgress(userId, showId);
      return updatedUserEpisode;
    } else {
      const [newUserEpisode] = await db.insert(userEpisodes).values({
        userId,
        episodeId,
        showId,
        watchStatus,
        watchedDate: watchStatus === "watched" ? new Date() : null,
      }).returning();

      await storage.updateShowProgress(userId, showId);
      return newUserEpisode;
    }
  },

  updateShowProgress: async (userId: number, showId: number) => {
    const showEpisodes = await db.query.episodes.findMany({
      where: eq(episodes.showId, showId),
    });

    const watchedEpisodes = await db.query.userEpisodes.findMany({
      where: and(
        eq(userEpisodes.userId, userId),
        eq(userEpisodes.showId, showId),
        eq(userEpisodes.watchStatus, "watched")
      ),
    });

    const totalEpisodes = showEpisodes.length;
    const watchedCount = watchedEpisodes.length;
    const progress = totalEpisodes > 0 ? Math.floor((watchedCount / totalEpisodes) * 100) : 0;

    await db.update(userShows)
      .set({
        progress,
        totalEpisodes,
        lastWatched: watchedEpisodes.length > 0
          ? new Date(Math.max(...watchedEpisodes.map((e: any) => e.watchedDate?.getTime() || 0)))
          : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userShows.userId, userId),
          eq(userShows.showId, showId)
        )
      );

    return { progress, totalEpisodes, watchedCount };
  },

  getSeasonProgress: async (userId: number, showId: number) => {
    const allEpisodes = await db.query.episodes.findMany({
      where: eq(episodes.showId, showId),
    });

    const watchedEpisodes = await db.query.userEpisodes.findMany({
      where: and(
        eq(userEpisodes.userId, userId),
        eq(userEpisodes.showId, showId),
        eq(userEpisodes.watchStatus, "watched")
      ),
      with: {
        episode: true,
      },
    });

    const seasonProgress: Record<number, {watched: number, total: number}> = {};

    allEpisodes.forEach((episode: any) => {
      if (!seasonProgress[episode.seasonNumber]) {
        seasonProgress[episode.seasonNumber] = { watched: 0, total: 0 };
      }
      seasonProgress[episode.seasonNumber].total++;
    });

    watchedEpisodes.forEach((userEpisode: any) => {
      const seasonNumber = userEpisode.episode.seasonNumber;
      if (seasonProgress[seasonNumber]) {
        seasonProgress[seasonNumber].watched++;
      }
    });

    return seasonProgress;
  },

  // User Lists operations
  getUserLists: async (userId: number) => {
    return await db.query.userLists.findMany({
      where: eq(userLists.userId, userId),
      orderBy: asc(userLists.name),
    });
  },

  createUserList: async (userId: number, name: string, color: string) => {
    const [list] = await db.insert(userLists).values({
      userId,
      name,
      color,
    }).returning();

    return list;
  },

  // --- REVISED POPULAR AND TOP RATED SHOWS AGAIN ---
  getPopularShows: async (limit = 12, genre?: string) => {
    const whereConditions = [];

    if (genre) {
      whereConditions.push(sql`${shows.genres} @> ARRAY[${genre}]::text[]`);
    }

    return await db.select().from(shows)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(limit)
      .orderBy(desc(shows.rating));
  },

  getRecentShows: async (limit = 12) => {
    return await db.select().from(shows)
      .orderBy(desc(shows.firstAired))
      .limit(limit);
  },

  getTopRatedShows: async (limit = 12, genre?: string) => {
    const whereConditions = [isNotNull(shows.rating)]; // Always include this condition

    if (genre) {
      whereConditions.push(sql`${shows.genres} @> ARRAY[${genre}]::text[]`);
    }

    return await db.select().from(shows)
      .where(and(...whereConditions))
      .orderBy(desc(shows.rating))
      .limit(limit);
  },

  getAllGenres: async () => {
    const result = await db.execute(
      sql`SELECT DISTINCT unnest(genres) as genre FROM shows ORDER BY genre`
    );
    return result.rows.map((row: any) => row.genre);
  },
};