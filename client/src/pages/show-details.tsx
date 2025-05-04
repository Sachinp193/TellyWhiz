import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import ShowBanner from "@/components/show/ShowBanner";
import SeasonSelector from "@/components/show/SeasonSelector";
import EpisodesList from "@/components/show/EpisodesList";
import { Show, Episode } from "@/lib/types";

const ShowDetails = () => {
  const [, params] = useRoute<{ id: string }>("/show/:id");
  const showId = params ? parseInt(params.id) : 0;
  
  const [selectedSeason, setSelectedSeason] = useState<number | "all">("all");
  const [activeTab, setActiveTab] = useState<string>("episodes");
  
  const { data: show, isLoading: loadingShow } = useQuery<Show>({
    queryKey: [`/api/shows/${showId}`],
    enabled: !!showId,
  });
  
  const { data: episodes, isLoading: loadingEpisodes } = useQuery<Episode[]>({
    queryKey: [`/api/shows/${showId}/episodes`],
    enabled: !!showId,
  });
  
  if (loadingShow) {
    return (
      <div>
        <div className="relative h-64 md:h-96 w-full bg-gradient-to-b from-gray-800 to-background-dark">
          <Skeleton className="absolute inset-0" />
        </div>
        
        <div className="container mx-auto px-4 pt-4">
          <Skeleton className="h-12 w-40 mb-4" />
          <Skeleton className="h-8 w-full max-w-3xl mb-2" />
          <Skeleton className="h-8 w-full max-w-xl mb-6" />
        </div>
      </div>
    );
  }
  
  if (!show) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Show Not Found</h2>
        <p className="text-text-secondary">The TV show you are looking for could not be found.</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <ShowBanner show={show} />
      
      <div className="container mx-auto px-4 pt-4">
        <div className="border-b border-gray-700">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="p-0 h-auto bg-transparent">
              <TabsTrigger 
                value="episodes" 
                className="mr-8 py-4 border-b-2 data-[state=active]:border-primary-light border-transparent data-[state=active]:text-primary-light text-text-secondary"
              >
                Episodes
              </TabsTrigger>
              <TabsTrigger 
                value="cast" 
                className="mr-8 py-4 border-b-2 data-[state=active]:border-primary-light border-transparent data-[state=active]:text-primary-light text-text-secondary"
              >
                Cast
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                className="mr-8 py-4 border-b-2 data-[state=active]:border-primary-light border-transparent data-[state=active]:text-primary-light text-text-secondary"
              >
                Details
              </TabsTrigger>
              <TabsTrigger 
                value="related" 
                className="mr-8 py-4 border-b-2 data-[state=active]:border-primary-light border-transparent data-[state=active]:text-primary-light text-text-secondary"
              >
                Related
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="episodes" className="pt-0 mt-0">
              <SeasonSelector 
                showId={showId} 
                selectedSeason={selectedSeason} 
                onSeasonChange={setSelectedSeason} 
              />
              
              <EpisodesList 
                episodes={episodes} 
                isLoading={loadingEpisodes}
                showId={showId}
                seasonFilter={selectedSeason}
              />
            </TabsContent>
            
            <TabsContent value="cast" className="pt-4">
              <h2 className="text-xl font-semibold mb-4">Cast & Crew</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <p className="col-span-full text-text-secondary">Cast information coming soon.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="pt-4">
              <h2 className="text-xl font-semibold mb-4">Show Details</h2>
              <div className="bg-background-card rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-text-muted">Status</p>
                    <p className="text-text-primary">{show.status || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Network</p>
                    <p className="text-text-primary">{show.network || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">First Aired</p>
                    <p className="text-text-primary">{show.firstAired || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Runtime</p>
                    <p className="text-text-primary">{show.runtime ? `${show.runtime} minutes` : "Unknown"}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="related" className="pt-4">
              <h2 className="text-xl font-semibold mb-4">Related Shows</h2>
              <p className="text-text-secondary">Related shows will appear here.</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ShowDetails;
