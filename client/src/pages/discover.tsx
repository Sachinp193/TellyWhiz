import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ShowCard from "@/components/show/ShowCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Show } from "@/lib/types";

const Discover = () => {
  const [genre, setGenre] = useState<string>("all");
  
  const { data: popularShows, isLoading: isLoadingPopular } = useQuery<Show[]>({
    queryKey: ['/api/shows/popular', { genre: genre !== 'all' ? genre : undefined }],
  });
  
  const { data: topRatedShows, isLoading: isLoadingTopRated } = useQuery<Show[]>({
    queryKey: ['/api/shows/top-rated', { genre: genre !== 'all' ? genre : undefined }],
  });
  
  const { data: genres } = useQuery<string[]>({
    queryKey: ['/api/genres'],
  });
  
  const renderShowsGrid = (shows: Show[] | undefined, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex flex-col">
              <Skeleton className="w-full pb-[150%] relative" />
              <Skeleton className="h-5 w-3/4 mt-2" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </div>
          ))}
        </div>
      );
    }
    
    if (!shows || shows.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-text-secondary">No shows found.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {shows.map(show => (
          <ShowCard key={show.id} show={show} />
        ))}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Discover TV Shows</h1>
        
        <div className="flex flex-wrap gap-2">
          <button 
            className={`px-3 py-1 text-sm rounded-full ${genre === 'all' ? 'bg-primary text-white' : 'bg-background-light text-text-secondary'}`}
            onClick={() => setGenre('all')}
          >
            All Genres
          </button>
          
          {genres?.map(g => (
            <button 
              key={g} 
              className={`px-3 py-1 text-sm rounded-full ${genre === g ? 'bg-primary text-white' : 'bg-background-light text-text-secondary'}`}
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      
      <Tabs defaultValue="popular" className="mb-8">
        <TabsList className="bg-background-card text-text-secondary mb-4">
          <TabsTrigger value="popular" className="data-[state=active]:text-primary-light">
            Popular
          </TabsTrigger>
          <TabsTrigger value="top-rated" className="data-[state=active]:text-primary-light">
            Top Rated
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="popular">
          {renderShowsGrid(popularShows, isLoadingPopular)}
        </TabsContent>
        
        <TabsContent value="top-rated">
          {renderShowsGrid(topRatedShows, isLoadingTopRated)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Discover;
