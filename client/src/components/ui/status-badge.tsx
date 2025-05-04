import { Check, Circle, Loader } from "lucide-react";
import { WatchStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: WatchStatus;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  if (status === "watched") {
    return (
      <div className="bg-status-watched text-white text-xs font-bold px-1.5 py-0.5 rounded inline-flex items-center">
        <Check className="mr-1 h-3 w-3" />
        <span>Watched</span>
      </div>
    );
  }
  
  if (status === "in-progress") {
    return (
      <div className="bg-status-inprogress text-white text-xs font-bold px-1.5 py-0.5 rounded inline-flex items-center">
        <Loader className="mr-1 h-3 w-3" />
        <span>In Progress</span>
      </div>
    );
  }
  
  return (
    <div className="bg-status-unwatched text-white text-xs font-bold px-1.5 py-0.5 rounded inline-flex items-center">
      <Circle className="mr-1 h-3 w-3" />
      <span>Unwatched</span>
    </div>
  );
};

export default StatusBadge;
