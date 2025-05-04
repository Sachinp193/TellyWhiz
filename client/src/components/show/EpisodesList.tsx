import { Fragment } from "react";
import EpisodeCard from "./EpisodeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Episode } from "@/lib/types";

interface EpisodesListProps {
  episodes: Episode[] | undefined;
  isLoading: boolean;
  showId: number;
  seasonFilter: number | "all";
}

const EpisodesList = ({ episodes, isLoading, showId, seasonFilter }: EpisodesListProps) => {
  const filteredEpisodes = episodes && seasonFilter !== "all"
    ? episodes.filter(episode => episode.seasonNumber === seasonFilter)
    : episodes;
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-background-card rounded-lg overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-48 h-28 md:h-40 relative flex-shrink-0">
                <Skeleton className="w-full h-full" />
              </div>
              <div className="p-4 flex-grow">
                <div className="flex justify-between">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-6 w-48 mb-3" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!filteredEpisodes || filteredEpisodes.length === 0) {
    return (
      <div className="bg-background-card rounded-lg p-6 text-center">
        <p className="text-text-secondary">No episodes found for this season.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {filteredEpisodes.map(episode => (
        <EpisodeCard key={episode.id} episode={episode} showId={showId} />
      ))}
    </div>
  );
};

export default EpisodesList;
