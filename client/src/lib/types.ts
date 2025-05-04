export interface Show {
  id: number;
  name: string;
  overview: string;
  status: string;
  firstAired: string;
  network: string;
  runtime: number;
  image: string;
  banner: string;
  rating: number;
  genres: string[];
  year: string;
}

export interface ShowSearchResult {
  id: number;
  name: string;
  overview: string;
  image: string;
  year: string;
}

export interface Season {
  id: number;
  number: number;
  name: string;
  overview: string;
  image: string;
  episodes: number;
  year: string;
}

export interface Episode {
  id: number;
  showId: number;
  seasonId: number;
  name: string;
  overview: string;
  seasonNumber: number;
  episodeNumber: number;
  firstAired: string;
  runtime: number;
  image: string;
  rating: number;
  watchStatus: "watched" | "unwatched" | "in-progress";
}

export interface Cast {
  id: number;
  name: string;
  role: string;
  image: string;
}

export interface UserShow {
  id: number;
  userId: number;
  showId: number;
  status: "watching" | "completed" | "on-hold" | "plan-to-watch";
  favorite: boolean;
  lastWatched: string;
  progress: number;
  totalEpisodes: number;
}

export interface UserList {
  id: number;
  userId: number;
  name: string;
  color: string;
}

export interface UserEpisode {
  id: number;
  userId: number;
  episodeId: number;
  showId: number;
  watchStatus: "watched" | "unwatched" | "in-progress";
  watchedDate: string | null;
  rating: number | null;
}

export type WatchStatus = "watched" | "unwatched" | "in-progress";
