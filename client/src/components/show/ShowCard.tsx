import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import RatingBadge from "@/components/ui/rating-badge";
import { Show } from "@/lib/types";

interface ShowCardProps {
  show: Show;
}

const ShowCard = ({ show }: ShowCardProps) => {
  return (
    <Link href={`/show/${show.id}`}>
      <a className="block">
        <Card className="h-full overflow-hidden bg-background-card border-gray-800 hover:border-primary-light transition-colors">
          <div className="relative pb-[150%]">
            <img 
              src={show.image || "https://via.placeholder.com/500x750?text=No+Image"}
              alt={show.name}
              className="absolute top-0 left-0 w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2">
              <RatingBadge rating={show.rating} />
            </div>
          </div>
          <CardContent className="p-3">
            <h3 className="font-semibold truncate">{show.name}</h3>
            <div className="flex justify-between items-center mt-1">
              <span className="text-text-secondary text-sm">{show.year}</span>
            </div>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
};

export default ShowCard;
