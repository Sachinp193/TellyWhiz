import { useState } from "react";
import { Bell } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tv } from "lucide-react";
import SearchBar from "@/components/search/SearchBar";

const Header = () => {
  const isMobile = useMobile();
  const [user, setUser] = useState<{username: string} | null>({ username: "User" });
  
  return (
    <header className="bg-background-card border-b border-gray-800">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Tv className="text-primary-light h-6 w-6" />
          <h1 className="text-xl font-semibold">SeriesTrack</h1>
        </div>
        
        <SearchBar />
        
        <div className="flex items-center">
          {!isMobile && (
            <button className="text-text-primary hover:text-primary-light mr-4">
              <Bell className="h-5 w-5" />
            </button>
          )}
          
          <div className="relative">
            <button className="flex items-center bg-background-light rounded-full p-1 hover:ring-2 hover:ring-primary-light focus:outline-none">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt={user?.username || "User"} />
                <AvatarFallback>{user?.username?.[0] || "U"}</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
