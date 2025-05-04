import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ShowCard from "@/components/show/ShowCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Show } from "@/lib/types";

const Home = () => {
  const { data: watchingShows, isLoading: loadingWatching } = useQuery<Show[]>({
    queryKey: ['/api/user/shows/watching'],
  });
  
  const { data: popularShows, isLoading: loadingPopular } = useQuery<Show[]>({
    queryKey: ['/api/shows/popular'],
  });
  
  const { data: recentlyAiredShows, isLoading: loadingRecent } = useQuery<Show[]>({
    queryKey: ['/api/shows/recent'],
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
      <h1 className="text-2xl font-bold mb-6">Welcome to SeriesTrack</h1>
      
      <Tabs defaultValue="watching" className="mb-8">
        <TabsList className="bg-background-card text-text-secondary mb-4">
          <TabsTrigger value="watching" className="data-[state=active]:text-primary-light">
            Continue Watching
          </TabsTrigger>
          <TabsTrigger value="popular" className="data-[state=active]:text-primary-light">
            Popular
          </TabsTrigger>
          <TabsTrigger value="recent" className="data-[state=active]:text-primary-light">
            Recently Aired
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="watching">
          {renderShowsGrid(watchingShows, loadingWatching)}
        </TabsContent>
        
        <TabsContent value="popular">
          {renderShowsGrid(popularShows, loadingPopular)}
        </TabsContent>
        
        <TabsContent value="recent">
          {renderShowsGrid(recentlyAiredShows, loadingRecent)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Home;
