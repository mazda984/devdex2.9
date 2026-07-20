import React from "react";
import { Link } from "wouter";
import { useGetFeaturedGames, useListGames, useGetGameStats, getGetFeaturedGamesQueryKey, getListGamesQueryKey, getGetGameStatsQueryKey } from "@workspace/api-client-react";
import GameCard from "@/components/ui/GameCard";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wrench, Users, Gamepad2, Play } from "lucide-react";

export default function Home() {
  const { data: featuredGames, isLoading: isLoadingFeatured } = useGetFeaturedGames({
    query: { queryKey: getGetFeaturedGamesQueryKey() }
  });
  
  const { data: recentGamesData, isLoading: isLoadingRecent } = useListGames(
    { limit: 8, offset: 0 },
    { query: { queryKey: getListGamesQueryKey({ limit: 8, offset: 0 }) } }
  );

  const { data: stats } = useGetGameStats({
    query: { queryKey: getGetGameStatsQueryKey() }
  });

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32 border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            Discover the best web games
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl text-foreground">
            Play instantly. <br className="hidden md:block" />
            <span className="text-primary">No downloads needed.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
            Browse thousands of high-quality browser games, share your own creations, and join a community of players and developers.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/games">
              <Button size="lg" className="font-bold text-lg h-14 px-8 w-full sm:w-auto shadow-md">
                <Gamepad2 className="w-5 h-5 mr-2" />
                Start Playing
              </Button>
            </Link>
            <Link href="/submit">
              <Button size="lg" variant="outline" className="h-14 px-8 font-bold text-lg bg-background w-full sm:w-auto shadow-sm">
                <Wrench className="w-5 h-5 mr-2" />
                Submit Game
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Games */}
      <section className="py-24 bg-background relative">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              Featured Games
            </h2>
          </div>

          {isLoadingFeatured ? (
            <Loader />
          ) : featuredGames && featuredGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {featuredGames.slice(0, 5).map((game, i) => (
                <div key={game.id} className={i < 2 ? "lg:col-span-2" : "lg:col-span-1"}>
                  <GameCard game={game} priority={true} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20">
              No featured games available right now.
            </div>
          )}
        </div>
      </section>

      {/* Platform Stats */}
      <section className="py-20 border-y border-border bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-primary-foreground/20">
            <div className="flex flex-col items-center justify-center p-6">
              <div className="mb-3 bg-white/20 p-3 rounded-full"><Gamepad2 className="w-8 h-8" /></div>
              <div className="text-4xl font-extrabold tracking-tight">
                {stats?.totalGames.toLocaleString() || "..."}
              </div>
              <div className="text-sm font-semibold opacity-80 mt-1 uppercase tracking-wider">Games Available</div>
            </div>
            <div className="flex flex-col items-center justify-center p-6">
              <div className="mb-3 bg-white/20 p-3 rounded-full"><Users className="w-8 h-8" /></div>
              <div className="text-4xl font-extrabold tracking-tight">
                {stats?.totalUsers.toLocaleString() || "..."}
              </div>
              <div className="text-sm font-semibold opacity-80 mt-1 uppercase tracking-wider">Active Players</div>
            </div>
            <div className="flex flex-col items-center justify-center p-6">
              <div className="mb-3 bg-white/20 p-3 rounded-full"><Play className="w-8 h-8" /></div>
              <div className="text-4xl font-extrabold tracking-tight">
                {stats?.totalPlays.toLocaleString() || "..."}
              </div>
              <div className="text-sm font-semibold opacity-80 mt-1 uppercase tracking-wider">Total Plays</div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Games */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              Recently Added
            </h2>
            <Link href="/games">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground group font-medium">
                View All <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {isLoadingRecent ? (
            <Loader />
          ) : recentGamesData?.games && recentGamesData.games.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {recentGamesData.games.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-xl bg-card">
              No games found. Be the first to submit one!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
