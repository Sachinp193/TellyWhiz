import { cn } from "@/lib/utils";

interface RatingBadgeProps {
  rating: number;
  size?: "sm" | "md" | "lg";
}

const RatingBadge = ({ rating, size = "md" }: RatingBadgeProps) => {
  if (!rating) return null;
  
  const formattedRating = Number.isInteger(rating) ? rating.toString() : rating.toFixed(1);
  
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-xs",
    lg: "px-2 py-1 text-sm"
  };
  
  return (
    <span 
      className={cn(
        "bg-yellow-500 text-black font-bold rounded inline-flex items-center justify-center",
        sizeClasses[size]
      )}
    >
      {formattedRating}
    </span>
  );
};

export default RatingBadge;
