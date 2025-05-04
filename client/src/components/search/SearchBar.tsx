import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ShowSearchResult } from '@/lib/types';
import { formatYear } from '@/lib/utils';

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [, navigate] = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  
  const { data: searchResults, isLoading } = useQuery<ShowSearchResult[]>({
    queryKey: ['/api/search', searchQuery],
    enabled: searchQuery.length > 2,
  });
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };
  
  const handleClearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
  };
  
  const handleSelectShow = (showId: number) => {
    navigate(`/show/${showId}`);
    setShowResults(false);
  };
  
  return (
    <div ref={searchRef} className="relative w-full max-w-md mx-4">
      <div className="relative">
        <Input
          type="text"
          placeholder="Search for TV shows..."
          className="w-full bg-background-light text-text-primary rounded-lg px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-primary-light"
          value={searchQuery}
          onChange={handleSearchInputChange}
          onFocus={() => searchQuery.length > 2 && setShowResults(true)}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted h-4 w-4" />
        {searchQuery && (
          <button 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text-primary"
            onClick={handleClearSearch}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {showResults && searchQuery.length > 2 && (
        <div className="absolute z-10 bg-background-card rounded-lg mt-1 w-full shadow-lg border border-gray-700">
          <div className="p-2">
            {isLoading ? (
              <div className="p-4 text-center text-text-muted">
                Searching...
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map(show => (
                <div 
                  key={show.id}
                  className="flex items-center p-2 hover:bg-background-light rounded cursor-pointer"
                  onClick={() => handleSelectShow(show.id)}
                >
                  <img 
                    src={show.image || "https://via.placeholder.com/45x63?text=No+Image"} 
                    alt={show.name} 
                    className="w-10 h-14 object-cover rounded mr-3" 
                  />
                  <div>
                    <p className="font-medium">{show.name}</p>
                    <p className="text-text-muted text-sm">{formatYear(show.year)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-text-muted">
                No shows found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
