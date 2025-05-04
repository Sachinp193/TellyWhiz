import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    console.log("🌱 Starting database seeding...");

    // Create a default user for testing
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.username, "demo"),
    });

    if (!existingUser) {
      console.log("Creating demo user...");
      const [user] = await db.insert(schema.users).values({
        username: "demo",
        password: "password", // In a real app, you would hash this
      }).returning();
      console.log(`Created user: ${user.username}`);
    } else {
      console.log("Demo user already exists");
    }

    // Seed initial TV shows
    const initialShows = [
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
        rating: 95, // 9.5/10 scaled to integer
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
        rating: 87, // 8.7/10 scaled to integer
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
        rating: 93, // 9.3/10 scaled to integer
        genres: ["Action", "Adventure", "Drama", "Fantasy"],
        year: "2011-2019",
      },
      {
        tvdbId: 79126,
        name: "The Office",
        overview: "A mockumentary on a group of typical office workers, where the workday consists of ego clashes, inappropriate behavior, and tedium.",
        status: "Ended",
        firstAired: "2005-03-24",
        network: "NBC",
        runtime: 22,
        image: "https://image.tmdb.org/t/p/w342/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg",
        banner: "https://image.tmdb.org/t/p/original/26rtDiLKvVxtBmSHBk8XDYStj1Q.jpg",
        rating: 88, // 8.8/10 scaled to integer
        genres: ["Comedy"],
        year: "2005-2013",
      },
      {
        tvdbId: 335280,
        name: "The Mandalorian",
        overview: "After the fall of the Galactic Empire, a lone gunfighter makes his way through the outer reaches of the lawless galaxy.",
        status: "Continuing",
        firstAired: "2019-11-12",
        network: "Disney+",
        runtime: 40,
        image: "https://image.tmdb.org/t/p/w342/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg",
        banner: "https://image.tmdb.org/t/p/original/xXHZeb1yhJvnSHPzZDqee0zfMb6.jpg",
        rating: 85, // 8.5/10 scaled to integer
        genres: ["Action", "Adventure", "Sci-Fi"],
        year: "2019-Present",
      },
      {
        tvdbId: 305288,
        name: "Stranger Things",
        overview: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
        status: "Continuing",
        firstAired: "2016-07-15",
        network: "Netflix",
        runtime: 50,
        image: "https://image.tmdb.org/t/p/w342/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
        banner: "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
        rating: 87, // 8.7/10 scaled to integer
        genres: ["Drama", "Fantasy", "Horror", "Mystery", "Sci-Fi"],
        year: "2016-Present",
      }
    ];

    for (const showData of initialShows) {
      const existingShow = await db.query.shows.findFirst({
        where: eq(schema.shows.tvdbId, showData.tvdbId),
      });

      if (existingShow) {
        console.log(`Show already exists: ${showData.name}`);
      } else {
        const [show] = await db.insert(schema.shows).values(showData).returning();
        console.log(`Added show: ${show.name}`);
      }
    }

    // Add Breaking Bad seasons
    const breakingBad = await db.query.shows.findFirst({
      where: eq(schema.shows.tvdbId, 81189),
    });

    if (breakingBad) {
      const seasons = [
        {
          tvdbId: 27272,
          showId: breakingBad.id,
          number: 1,
          name: "Season 1",
          overview: "The first season of Breaking Bad.",
          image: "https://image.tmdb.org/t/p/w342/1BP4xYv9ZG4ZVHkL7ocOziBbSYH.jpg",
          episodes: 7,
          year: "2008",
        },
        {
          tvdbId: 27273,
          showId: breakingBad.id,
          number: 2,
          name: "Season 2",
          overview: "The second season of Breaking Bad.",
          image: "https://image.tmdb.org/t/p/w342/aEBmkC5TzRZOx3uWgJFJgK3fUTy.jpg",
          episodes: 13,
          year: "2009",
        },
        {
          tvdbId: 27274,
          showId: breakingBad.id,
          number: 3,
          name: "Season 3",
          overview: "The third season of Breaking Bad.",
          image: "https://image.tmdb.org/t/p/w342/ffMq69U7vwehCXJLNK8CpWEQZwG.jpg",
          episodes: 13,
          year: "2010",
        },
        {
          tvdbId: 27275,
          showId: breakingBad.id,
          number: 4,
          name: "Season 4",
          overview: "The fourth season of Breaking Bad.",
          image: "https://image.tmdb.org/t/p/w342/5ewrnKp4OgFZrVkGGJbN7RPYuVv.jpg",
          episodes: 13,
          year: "2011",
        },
        {
          tvdbId: 27276,
          showId: breakingBad.id,
          number: 5,
          name: "Season 5",
          overview: "The fifth season of Breaking Bad.",
          image: "https://image.tmdb.org/t/p/w342/r3z70vunihrAkjIqQwjubOOiz3A.jpg",
          episodes: 16,
          year: "2012-2013",
        }
      ];

      for (const seasonData of seasons) {
        const existingSeason = await db.query.seasons.findFirst({
          where: eq(schema.seasons.tvdbId, seasonData.tvdbId),
        });

        if (existingSeason) {
          console.log(`Season already exists: ${seasonData.name}`);
        } else {
          const [season] = await db.insert(schema.seasons).values(seasonData).returning();
          console.log(`Added season: ${season.name}`);
        }
      }

      // Add some episodes for Season 5
      const season5 = await db.query.seasons.findFirst({
        where: eq(schema.seasons.tvdbId, 27276),
      });

      if (season5) {
        const episodes = [
          {
            tvdbId: 4267640,
            showId: breakingBad.id,
            seasonId: season5.id,
            name: "Ozymandias",
            overview: "Everyone copes with radically changed circumstances.",
            seasonNumber: 5,
            episodeNumber: 14,
            firstAired: "2013-09-15",
            runtime: 47,
            image: "https://image.tmdb.org/t/p/w300/2QoAhQw8UvVN6CkKbJNCwM9OUoA.jpg",
            rating: 99, // 9.9/10 scaled to integer
          },
          {
            tvdbId: 4267641,
            showId: breakingBad.id,
            seasonId: season5.id,
            name: "Granite State",
            overview: "Events set in motion long ago move toward a conclusion.",
            seasonNumber: 5,
            episodeNumber: 15,
            firstAired: "2013-09-22",
            runtime: 55,
            image: "https://image.tmdb.org/t/p/w300/cmQqRJe5sSZ9DzGnDEeZkYGOfcS.jpg",
            rating: 88, // 8.8/10 scaled to integer
          },
          {
            tvdbId: 4267642,
            showId: breakingBad.id,
            seasonId: season5.id,
            name: "Felina",
            overview: "The series finale.",
            seasonNumber: 5,
            episodeNumber: 16,
            firstAired: "2013-09-29",
            runtime: 55,
            image: "https://image.tmdb.org/t/p/w300/pA0YwyhvdDXP3BEGL2grrIhq8aM.jpg",
            rating: 99, // 9.9/10 scaled to integer
          }
        ];

        for (const episodeData of episodes) {
          const existingEpisode = await db.query.episodes.findFirst({
            where: eq(schema.episodes.tvdbId, episodeData.tvdbId),
          });

          if (existingEpisode) {
            console.log(`Episode already exists: ${episodeData.name}`);
          } else {
            const [episode] = await db.insert(schema.episodes).values(episodeData).returning();
            console.log(`Added episode: ${episode.name}`);
          }
        }
      }
    }

    // Create default user lists
    const user = await db.query.users.findFirst({
      where: eq(schema.users.username, "demo"),
    });

    if (user) {
      const defaultLists = [
        { name: "Currently Watching", color: "blue" },
        { name: "Completed", color: "green" },
        { name: "On Hold", color: "yellow" },
        { name: "Plan to Watch", color: "purple" }
      ];

      for (const listData of defaultLists) {
        const existingList = await db.query.userLists.findFirst({
          where: eq(schema.userLists.name, listData.name),
        });

        if (existingList) {
          console.log(`List already exists: ${listData.name}`);
        } else {
          const [list] = await db.insert(schema.userLists).values({
            userId: user.id,
            name: listData.name,
            color: listData.color,
          }).returning();
          console.log(`Added list: ${list.name}`);
        }
      }
    }

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    process.exit(1);
  }
}

seed();
