import React, { useState, useEffect } from "react";
import { useListGames, useSearchGames, getListGamesQueryKey, getSearchGamesQueryKey } from "@workspace/api-client-react";
import GameCard from "@/components/ui/GameCard";
import { Loader } from "@/components/ui/Loader";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";

export default function Games() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: listData, isLoading: isLoadingList } = useListGames(
    { limit: 50, offset: 0 },
    { 
      query: { 
        enabled: debouncedQuery.length === 0,
        queryKey: getListGamesQueryKey({ limit: 50, offset: 0 }) 
      } 
    }
  );

  const { data: searchData, isLoading: isLoadingSearch } = useSearchGames(
    { q: debouncedQuery },
    { 
      query: { 
        enabled: debouncedQuery.length > 0,
        queryKey: getSearchGamesQueryKey({ q: debouncedQuery })
      } 
    }
  );

  const games = debouncedQuery.length > 0 ? searchData : listData?.games;
  const isLoading = (debouncedQuery.length > 0 && isLoadingSearch) || (debouncedQuery.length === 0 && isLoadingList);

  return (
    <div className="container mx-auto px-4 py-12 flex-1 flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-foreground mb-2">
            Browse Games
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover thousands of games to play instantly.
          </p>
        </div>
        
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-5 h-5" />
          </div>
          <Input
            type="search"
            placeholder="Search for games..."
            className="pl-12 h-14 bg-background border-border text-base rounded-xl shadow-sm focus-visible:ring-primary focus-visible:border-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {debouncedQuery !== searchQuery && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="pt-20"><Loader /></div>
        ) : games && games.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-2xl border border-border">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <Filter className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No games found</h3>
            <p className="text-muted-foreground">
              We couldn't find any games matching "{debouncedQuery}". Try a different search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
