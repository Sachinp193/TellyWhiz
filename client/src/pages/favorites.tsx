import { useQuery } from "@tanstack/react-query";
import ShowCard from "@/components/show/ShowCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";
import { Show } from "@/lib/types";

const Favorites = () => {
  const { data: favoriteShows, isLoading } = useQuery<Show[]>({
    queryKey: ['/api/user/favorites'],
  });
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">My Favorites</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex flex-col">
              <Skeleton className="w-full pb-[150%] relative" />
              <Skeleton className="h-5 w-3/4 mt-2" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (!favoriteShows || favoriteShows.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">My Favorites</h1>
        <div className="bg-background-card rounded-lg p-8 text-center">
          <Heart className="mx-auto h-16 w-16 text-text-muted mb-4" />
          <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
          <p className="text-text-secondary">
            Start adding shows to your favorites to see them here.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">My Favorites</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {favoriteShows.map(show => (
          <ShowCard key={show.id} show={show} />
        ))}
      </div>
    </div>
  );
};

export default Favorites;
