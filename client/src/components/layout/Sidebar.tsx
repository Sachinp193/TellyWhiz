import { Link, useLocation } from "wouter";
import { useMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Home, Compass, Heart, CalendarCheck, Clock } from "lucide-react";

const Sidebar = () => {
  const [location] = useLocation();
  const isMobile = useMobile();
  
  const { data: userLists } = useQuery({
    queryKey: ['/api/lists'],
  });
  
  return (
    <aside className="bg-background-card w-16 md:w-56 flex-shrink-0 border-r border-gray-800 flex flex-col">
      <nav className="p-3 flex-1">
        <ul className="space-y-2">
          <li>
            <Link href="/">
              <a className={`flex items-center rounded-lg p-2 ${location === '/' ? 'text-primary-light bg-background-light bg-opacity-40' : 'text-text-primary hover:bg-background-light'}`}>
                <Home className="w-6 h-6 md:mr-3 text-center" />
                <span className="hidden md:block">Home</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/discover">
              <a className={`flex items-center rounded-lg p-2 ${location === '/discover' ? 'text-primary-light bg-background-light bg-opacity-40' : 'text-text-primary hover:bg-background-light'}`}>
                <Compass className="w-6 h-6 md:mr-3 text-center" />
                <span className="hidden md:block">Discover</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/favorites">
              <a className={`flex items-center rounded-lg p-2 ${location === '/favorites' ? 'text-primary-light bg-background-light bg-opacity-40' : 'text-text-primary hover:bg-background-light'}`}>
                <Heart className="w-6 h-6 md:mr-3 text-center" />
                <span className="hidden md:block">Favorites</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/calendar">
              <a className={`flex items-center rounded-lg p-2 ${location === '/calendar' ? 'text-primary-light bg-background-light bg-opacity-40' : 'text-text-primary hover:bg-background-light'}`}>
                <CalendarCheck className="w-6 h-6 md:mr-3 text-center" />
                <span className="hidden md:block">Calendar</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/watch-later">
              <a className={`flex items-center rounded-lg p-2 ${location === '/watch-later' ? 'text-primary-light bg-background-light bg-opacity-40' : 'text-text-primary hover:bg-background-light'}`}>
                <Clock className="w-6 h-6 md:mr-3 text-center" />
                <span className="hidden md:block">Watch Later</span>
              </a>
            </Link>
          </li>
        </ul>
        
        {!isMobile && (
          <div className="mt-8">
            <h3 className="px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
              MY LISTS
            </h3>
            <ul className="mt-2 space-y-1">
              {userLists ? (
                userLists.map((list: any) => (
                  <li key={list.id}>
                    <Link href={`/list/${list.id}`}>
                      <a className="flex items-center rounded-lg p-2 text-text-primary hover:bg-background-light">
                        <span className={`w-2 h-2 rounded-full bg-${list.color}-500 mr-2`}></span>
                        <span>{list.name}</span>
                      </a>
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <a href="#" className="flex items-center rounded-lg p-2 text-text-primary hover:bg-background-light">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                      <span>Currently Watching</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center rounded-lg p-2 text-text-primary hover:bg-background-light">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                      <span>Completed</span>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center rounded-lg p-2 text-text-primary hover:bg-background-light">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                      <span>On Hold</span>
                    </a>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
      </nav>
      
      {!isMobile && (
        <div className="p-3">
          <Button className="w-full bg-primary hover:bg-primary-dark">
            <Plus className="mr-2 h-4 w-4" />
            <span>Create List</span>
          </Button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
