import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Play, MoreVertical, MessageSquare, Bookmark, Check, Circle, Loader } from "lucide-react";
import RatingBadge from "@/components/ui/rating-badge";
import StatusBadge from "@/components/ui/status-badge";
import { Episode, WatchStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface EpisodeCardProps {
  episode: Episode;
  showId: number;
}

const EpisodeCard = ({ episode, showId }: EpisodeCardProps) => {
  const queryClient = useQueryClient();
  const [watchStatus, setWatchStatus] = useState<WatchStatus>(episode.watchStatus);
  
  const updateWatchStatusMutation = useMutation({
    mutationFn: async (newStatus: WatchStatus) => {
      const response = await apiRequest('PATCH', '/api/episodes/watch-status', {
        episodeId: episode.id,
        showId,
        watchStatus: newStatus
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/shows/${showId}/episodes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/shows/${showId}`] });
    }
  });
  
  const handleToggleWatchStatus = () => {
    let newStatus: WatchStatus;
    if (watchStatus === 'watched') {
      newStatus = 'unwatched';
    } else if (watchStatus === 'unwatched') {
      newStatus = 'in-progress';
    } else {
      newStatus = 'watched';
    }
    
    setWatchStatus(newStatus);
    updateWatchStatusMutation.mutate(newStatus);
  };
  
  const formattedDate = episode.firstAired ? formatDate(new Date(episode.firstAired)) : 'Unknown';
  
  return (
    <Card className="bg-background-card rounded-lg overflow-hidden hover:bg-background-light transition-colors duration-200">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-48 h-28 md:h-auto relative flex-shrink-0">
          <img 
            src={episode.image || "https://via.placeholder.com/300x170?text=No+Preview"}
            alt={episode.name} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <button className="rounded-full bg-white bg-opacity-25 p-3 hover:bg-opacity-50 transition-all">
              <Play className="text-white h-4 w-4" />
            </button>
          </div>
          <div 
            className="absolute bottom-2 right-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleWatchStatus();
            }}
          >
            <StatusBadge status={watchStatus} />
          </div>
        </div>
        
        <div className="p-4 flex-grow flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <span className="text-text-secondary">S{String(episode.seasonNumber).padStart(2, '0')}E{String(episode.episodeNumber).padStart(2, '0')}</span>
                <span className="mx-2 text-text-muted">•</span>
                <span className="text-text-secondary">{formattedDate}</span>
              </div>
              <h3 className="font-semibold text-lg mt-1">{episode.name}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <RatingBadge rating={episode.rating} />
              <button className="text-text-muted hover:text-text-primary">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <p className="text-text-secondary text-sm mt-2 line-clamp-2">
            {episode.overview || "No overview available."}
          </p>
          
          <div className="flex justify-between items-center mt-auto pt-3">
            <span className="text-text-muted text-sm">{episode.runtime} min</span>
            <div className="flex space-x-2">
              <button className="flex items-center text-text-secondary hover:text-text-primary text-sm">
                <MessageSquare className="mr-1 h-4 w-4" />
                <span>Comments</span>
              </button>
              <button className="flex items-center text-text-secondary hover:text-text-primary text-sm">
                <Bookmark className="mr-1 h-4 w-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EpisodeCard;
