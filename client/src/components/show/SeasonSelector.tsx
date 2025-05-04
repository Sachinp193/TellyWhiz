import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Season } from "@/lib/types";

interface SeasonSelectorProps {
  showId: number;
  selectedSeason: number | "all";
  onSeasonChange: (season: number | "all") => void;
}

const SeasonSelector = ({ showId, selectedSeason, onSeasonChange }: SeasonSelectorProps) => {
  const { data: seasons } = useQuery<Season[]>({
    queryKey: [`/api/shows/${showId}/seasons`],
  });
  
  const { data: seasonProgress } = useQuery<Record<number, {watched: number, total: number}>>({
    queryKey: [`/api/shows/${showId}/progress`],
  });
  
  const handleSeasonChange = (value: string) => {
    onSeasonChange(value === "all" ? "all" : parseInt(value));
  };
  
  const currentSeason = seasons?.find(s => s.number === selectedSeason);
  const progress = selectedSeason !== "all" && seasonProgress 
    ? seasonProgress[selectedSeason as number] 
    : undefined;
  
  const watched = progress?.watched || 0;
  const total = progress?.total || 0;
  const progressPercentage = total > 0 ? (watched / total) * 100 : 0;
  
  return (
    <div className="pt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Seasons</h2>
        <Select
          value={selectedSeason === "all" ? "all" : String(selectedSeason)}
          onValueChange={handleSeasonChange}
        >
          <SelectTrigger className="w-40 bg-background-light text-text-primary rounded-lg border border-gray-700">
            <SelectValue placeholder="Select season" />
          </SelectTrigger>
          <SelectContent className="bg-background-card text-text-primary border-gray-700">
            <SelectItem value="all">All Seasons</SelectItem>
            {seasons?.map(season => (
              <SelectItem key={season.id} value={String(season.number)}>
                Season {season.number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSeason !== "all" && currentSeason && (
        <div className="bg-background-card p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="font-medium">Season {currentSeason.number}</h3>
              <p className="text-text-secondary text-sm">{currentSeason.episodes} episodes • {currentSeason.year}</p>
            </div>
            <div className="text-right">
              <span className={`${watched === total ? 'text-status-watched' : 'text-text-secondary'} font-medium`}>
                {watched}/{total} episodes watched
              </span>
              <div className="mt-1 w-32">
                <Progress value={progressPercentage} className="h-2 bg-background-dark" indicatorClassName="bg-status-watched" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonSelector;
