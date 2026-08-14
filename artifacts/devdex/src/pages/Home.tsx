import React from "react";
import { Link } from "wouter";
import { useGetFeaturedGames, useListGames, useGetGameStats, getGetFeaturedGamesQueryKey, getListGamesQueryKey, getGetGameStatsQueryKey } from "@workspace/api-client-react";
import type { Game, User } from "@workspace/api-client-react";import { useMyFriends, type FriendWithPresence } from "@/lib/extra-api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import GameCard from "@/components/ui/GameCard";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/button";
import {
  Home as HomeIcon, User as UserIcon, MessageCircle, Users, Shirt,
  Package, UsersRound, Rss, Sparkles, UserCircle, Gamepad2,
} from "lucide-react";

function SidebarLink({ href, icon, label, badge }: { href: string; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <span className="flex items-center gap-3">
        <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
        {label}
      </span>
      {!!badge && (
        <span className="bg-primary text-primary-foreground text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { t } = useI18n();

  const { data: featuredGames, isLoading: isLoadingFeatured } = useGetFeaturedGames({
    query: { queryKey: getGetFeaturedGamesQueryKey() }
  });

  const { data: recentGamesData, isLoading: isLoadingRecent } = useListGames(
    { limit: 12, offset: 0 },
    { query: { queryKey: getListGamesQueryKey({ limit: 12, offset: 0 }) } }
  );

  const { data: stats } = useGetGameStats({
    query: { queryKey: getGetGameStatsQueryKey() }
  });

  const { data: friends } = useMyFriends();

  // Logged-out visitors still get a normal marketing-style landing page - the
  // Roblox-style dashboard below only makes sense once you have an account
  // (friends, continue-playing, etc. are all per-user).
  if (!user) {
    return (
      <div className="flex flex-col w-full">
        <section className="relative overflow-hidden pt-24 pb-32 border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl text-foreground">
              {t("home.welcome")}
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
              Browse thousands of high-quality browser games, share your own creations, and join a community of players and developers.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/games">
                <Button size="lg" className="font-bold text-lg h-14 px-8 w-full sm:w-auto shadow-md">
                  <Gamepad2 className="w-5 h-5 mr-2" />
                  {t("home.playNow")}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="h-14 px-8 font-bold text-lg bg-background w-full sm:w-auto shadow-sm">
                  {t("nav.signup")}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-foreground mb-12">{t("home.featured")}</h2>
            {isLoadingFeatured ? (
              <Loader />
            ) : featuredGames && featuredGames.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {featuredGames.slice(0, 5).map((game: Game, i: number) => (
                  <div key={game.id} className={i < 2 ? "lg:col-span-2" : "lg:col-span-1"}>
                    <GameCard game={game} priority={true} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/20">
                {t("home.noFeatured")}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  // Logged-in dashboard, laid out like a classic game-platform homepage:
  // left icon sidebar, greeting + friends, "continue playing" row, activity feed.
  return (
    <div className="container mx-auto px-4 py-6 flex-1 w-full">
      <div className="flex gap-6 items-start">
        {/* Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 gap-1 sticky top-20">
          <SidebarLink href="/" icon={<HomeIcon className="w-5 h-5" />} label={t("sidebar.home")} />
          <SidebarLink href={`/profile/${user.id}`} icon={<UserIcon className="w-5 h-5" />} label={t("sidebar.profile")} />
          <SidebarLink href="/messages" icon={<MessageCircle className="w-5 h-5" />} label={t("sidebar.messages")} />
          <SidebarLink href={`/profile/${user.id}`} icon={<Users className="w-5 h-5" />} label={t("sidebar.friends")} badge={friends?.length || 0} />
          <SidebarLink href="/catalog" icon={<Shirt className="w-5 h-5" />} label={t("sidebar.avatar")} />
          <SidebarLink href="/catalog" icon={<Package className="w-5 h-5" />} label={t("sidebar.inventory")} />
          <SidebarLink href="/groups" icon={<UsersRound className="w-5 h-5" />} label={t("sidebar.groups")} />
          <SidebarLink href="/" icon={<Rss className="w-5 h-5" />} label={t("sidebar.feed")} />

          <div className="pt-3 mt-2 border-t border-border">
            <Link href="/catalog">
              <Button className="w-full font-bold shadow-sm">
                <Sparkles className="w-4 h-4 mr-2" />
                {t("sidebar.upgrade")}
              </Button>
            </Link>
          </div>
        </aside>

        {/* Main column */}
        <main className="flex-1 min-w-0">
          {/* Greeting */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-9 h-9 text-muted-foreground" />
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-foreground">
              {t("home.hello", { name: user.username })}
            </h1>
          </div>

          {/* Friends */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground">
                {t("home.friends")} ({friends?.length || 0})
              </h2>
              <Link href={`/profile/${user.id}`} className="text-sm font-medium text-primary hover:underline">
                {t("home.seeAll")}
              </Link>
            </div>
            <div className="bg-card border border-border rounded-xl min-h-[110px]">
              {friends && friends.length > 0 ? (
                <>
                  {friends.some((f: FriendWithPresence) => f.online && f.currentGameId) && (
                    <div className="flex flex-col gap-2 p-4 border-b border-border">
                      {friends
                        .filter((f: FriendWithPresence) => f.online && f.currentGameId)
                        .map((f: FriendWithPresence) => (
                          <div key={f.id} className="flex items-center gap-3 bg-secondary/50 border border-border rounded-lg px-3 py-2">
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-full bg-secondary border border-border overflow-hidden">
                                {f.avatarUrl ? (
                                  <img src={f.avatarUrl} alt={f.username} className="w-full h-full object-cover" />
                                ) : (
                                  <UserCircle className="w-full h-full text-muted-foreground p-1.5" />
                                )}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-foreground truncate">{f.username}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {t("home.playing", { game: f.currentGameTitle || "" })}
                              </div>
                            </div>
                            <Link href={`/games/${f.currentGameId}?join=1`}>
                              <Button size="sm" className="font-semibold shrink-0">
                                <Gamepad2 className="w-3.5 h-3.5 mr-1.5" />
                                {t("home.join")}
                              </Button>
                            </Link>
                          </div>
                        ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 p-4">
                    {friends.slice(0, 8).map((f: FriendWithPresence) => (
                      <Link key={f.id} href={`/profile/${f.id}`} className="flex flex-col items-center gap-1.5 group w-16">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full bg-secondary border border-border overflow-hidden group-hover:border-primary transition-colors">
                            {f.avatarUrl ? (
                              <img src={f.avatarUrl} alt={f.username} className="w-full h-full object-cover" />
                            ) : (
                              <UserCircle className="w-full h-full text-muted-foreground p-2" />
                            )}
                          </div>
                          {f.online && (
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card" />
                          )}
                        </div>
                        <span className="text-xs text-center truncate w-full text-muted-foreground group-hover:text-foreground">
                          {f.username}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center min-h-[110px]">
                  <p className="text-sm text-muted-foreground px-4">{t("home.noFriends")}</p>
                </div>
              )}
            </div>
          </section>

          {/* Continue playing */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground">{t("home.continue")}</h2>
              <Link href="/games" className="text-sm font-medium text-primary hover:underline">
                {t("home.seeAll")}
              </Link>
            </div>
            {isLoadingRecent ? (
              <Loader />
            ) : recentGamesData?.games && recentGamesData.games.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {recentGamesData.games.slice(0, 6).map((game: Game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl bg-card">
                {t("home.noGames")}
              </div>
            )}
          </section>

          {/* Featured */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground">{t("home.featured")}</h2>
              <Link href="/games" className="text-sm font-medium text-primary hover:underline">
                {t("home.seeAll")}
              </Link>
            </div>
            {isLoadingFeatured ? (
              <Loader />
            ) : featuredGames && featuredGames.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {featuredGames.slice(0, 6).map((game: Game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl bg-card">
                {t("home.noFeatured")}
              </div>
            )}
          </section>

          {/* Platform stats strip */}
          {stats && (
            <section className="grid grid-cols-3 divide-x divide-border border border-border rounded-xl overflow-hidden bg-card mb-4">
              <div className="flex flex-col items-center justify-center py-5">
                <div className="text-2xl font-extrabold text-foreground">{stats.totalGames.toLocaleString()}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1">{t("home.games")}</div>
              </div>
              <div className="flex flex-col items-center justify-center py-5">
                <div className="text-2xl font-extrabold text-foreground">{stats.totalUsers.toLocaleString()}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1">{t("home.players")}</div>
              </div>
              <div className="flex flex-col items-center justify-center py-5">
                <div className="text-2xl font-extrabold text-foreground">{stats.totalPlays.toLocaleString()}</div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1">{t("home.plays")}</div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
