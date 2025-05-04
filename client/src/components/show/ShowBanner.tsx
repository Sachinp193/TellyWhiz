import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GenreBadge from "@/components/ui/genre-badge";
import RatingBadge from "@/components/ui/rating-badge";
import { apiRequest } from "@/lib/queryClient";
import { Show } from "@/lib/types";

interface ShowBannerProps {
  show: Show;
}

const ShowBanner = ({ show }: ShowBannerProps) => {
  const queryClient = useQueryClient();
  const [isTracking, setIsTracking] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const { data: userShowData } = useQuery({
    queryKey: [`/api/user/shows/${show.id}`],
    onSuccess: (data) => {
      if (data) {
        setIsTracking(true);
        setIsFavorite(data.favorite);
      }
    },
  });
  
  const trackShowMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        isTracking ? 'DELETE' : 'POST',
        `/api/user/shows/${show.id}/track`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      setIsTracking(!isTracking);
      queryClient.invalidateQueries({ queryKey: [`/api/user/shows/${show.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/shows'] });
    }
  });
  
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'PATCH',
        `/api/user/shows/${show.id}/favorite`,
        { favorite: !isFavorite }
      );
      return response.json();
    },
    onSuccess: () => {
      setIsFavorite(!isFavorite);
      queryClient.invalidateQueries({ queryKey: [`/api/user/shows/${show.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/favorites'] });
    }
  });
  
  const handleTrackShow = () => {
    trackShowMutation.mutate();
  };
  
  const handleToggleFavorite = () => {
    if (!isTracking) {
      trackShowMutation.mutate();
    }
    toggleFavoriteMutation.mutate();
  };
  
  return (
    <div className="relative h-64 md:h-96 w-full bg-gradient-to-b from-gray-800 to-background-dark">
      <div 
        className="absolute inset-0 bg-cover bg-center" 
        style={{ backgroundImage: `url('${show.banner}')` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      </div>
      <div className="container mx-auto px-4 h-full flex items-end pb-6">
        <div className="flex flex-col md:flex-row items-center md:items-end">
          <div className="w-32 h-48 md:w-40 md:h-60 flex-shrink-0 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
            <img 
              src={show.image || "https://via.placeholder.com/300x450?text=No+Poster"} 
              alt={`${show.name} Poster`} 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="md:ml-6 mt-4 md:mt-0 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center">
              <h1 className="text-3xl md:text-4xl font-bold text-white">{show.name}</h1>
              <div className="md:ml-3 mt-1 md:mt-0">
                <RatingBadge rating={show.rating} size="lg" />
              </div>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start mt-2 gap-2">
              {show.genres?.map(genre => (
                <GenreBadge key={genre} genre={genre} />
              ))}
            </div>
            <p className="mt-3 text-text-secondary text-sm md:max-w-3xl">
              {show.overview || "No overview available."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
              <Button 
                className={`flex items-center ${isTracking ? 'bg-background-light hover:bg-gray-700' : 'bg-primary hover:bg-primary-dark'}`}
                onClick={handleTrackShow}
                disabled={trackShowMutation.isPending}
              >
                <Bookmark className="mr-2 h-4 w-4" />
                <span>{isTracking ? 'Untrack Show' : 'Track Show'}</span>
              </Button>
              <Button 
                className={`flex items-center bg-background-light hover:bg-gray-700 ${isFavorite ? 'text-secondary-light' : ''}`}
                onClick={handleToggleFavorite}
                disabled={toggleFavoriteMutation.isPending}
              >
                <Heart className="mr-2 h-4 w-4 fill-current" />
                <span>{isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
              </Button>
              <Button className="flex items-center bg-background-light hover:bg-gray-700">
                <Share2 className="mr-2 h-4 w-4" />
                <span>Share</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowBanner;
