import { apiRequest } from "./queryClient";
import { Show, ShowSearchResult, Season, Episode, Cast } from "./types";

export async function searchShows(query: string): Promise<ShowSearchResult[]> {
  const response = await apiRequest('GET', `/api/search?q=${encodeURIComponent(query)}`, undefined);
  return await response.json();
}

export async function getShow(id: number): Promise<Show> {
  const response = await apiRequest('GET', `/api/shows/${id}`, undefined);
  return await response.json();
}

export async function getSeasons(showId: number): Promise<Season[]> {
  const response = await apiRequest('GET', `/api/shows/${showId}/seasons`, undefined);
  return await response.json();
}

export async function getEpisodes(showId: number): Promise<Episode[]> {
  const response = await apiRequest('GET', `/api/shows/${showId}/episodes`, undefined);
  return await response.json();
}

export async function getCast(showId: number): Promise<Cast[]> {
  const response = await apiRequest('GET', `/api/shows/${showId}/cast`, undefined);
  return await response.json();
}

export async function trackShow(showId: number): Promise<void> {
  await apiRequest('POST', `/api/user/shows/${showId}/track`, {});
}

export async function untrackShow(showId: number): Promise<void> {
  await apiRequest('DELETE', `/api/user/shows/${showId}/track`, {});
}

export async function toggleFavorite(showId: number, favorite: boolean): Promise<void> {
  await apiRequest('PATCH', `/api/user/shows/${showId}/favorite`, { favorite });
}

export async function updateEpisodeStatus(
  episodeId: number,
  showId: number,
  status: 'watched' | 'unwatched' | 'in-progress'
): Promise<void> {
  await apiRequest('PATCH', '/api/episodes/watch-status', {
    episodeId,
    showId,
    watchStatus: status
  });
}
