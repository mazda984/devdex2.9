import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetGame,
  getGetGameQueryKey,
  useDeleteGame,
  getGetUserGamesQueryKey,
  getListGamesQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Play, Calendar, User as UserIcon, Tag, ExternalLink, X, Share2, Gamepad2, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { format } from "date-fns";

function GameOverlay({ title, gameUrl, onClose }: { title: string; gameUrl: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-12 bg-black/80 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <span className="text-white font-semibold text-sm truncate">{title}</span>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close game"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {/* Game iframe */}
      <iframe
        src={gameUrl}
        className="flex-1 w-full border-none"
        title={title}
        allow="fullscreen; gamepad; autoplay"
      />
    </div>,
    document.body
  );
}

export default function GameDetail() {
  const { id } = useParams();
  const gameId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: game, isLoading, error } = useGetGame(gameId, {
    query: {
      enabled: !!gameId,
      queryKey: getGetGameQueryKey(gameId)
    }
  });

  const deleteGame = useDeleteGame({
    mutation: {
      onSuccess: () => {
        toast({ title: "Oyun silindi" });
        if (game) {
          queryClient.invalidateQueries({ queryKey: getGetUserGamesQueryKey(game.authorId) });
        }
        queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
        setLocation(currentUser ? `/profile/${currentUser.id}` : "/games");
      },
      onError: () => {
        toast({
          title: "Oyun silinemedi",
          description: "Bir hata oluştu, lütfen tekrar dene.",
          variant: "destructive",
        });
      },
    },
  });

  const isOwner = !!currentUser && !!game && currentUser.id === game.authorId;

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center min-h-[60vh]"><Loader /></div>;
  }

  if (error || !game) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4 text-foreground">Game Not Found</h1>
        <p className="text-muted-foreground mb-8">The requested game could not be found.</p>
        <Button onClick={() => setLocation("/games")}>Return to Games</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full flex-1 bg-background">
      {/* Header / Cover */}
      <div className="w-full h-[40vh] md:h-[50vh] relative bg-muted border-b border-border overflow-hidden">
        {game.coverImageUrl ? (
          <img 
            src={game.coverImageUrl} 
            alt={game.title} 
            className="w-full h-full object-cover opacity-50 blur-md scale-110"
          />
        ) : (
          <div className="w-full h-full bg-secondary/80"></div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
        <div className="absolute inset-0 container mx-auto px-4 flex flex-col justify-end pb-8 z-10">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-end">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl border-4 border-background bg-card overflow-hidden shadow-lg flex-shrink-0 relative z-20">
              {game.coverImageUrl ? (
                <img src={game.coverImageUrl} alt={game.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary">
                  <Gamepad2 className="w-16 h-16 text-muted-foreground/40" />
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-3 pb-2 w-full">
              <div className="flex flex-wrap items-center gap-2">
                {game.category && (
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2.5 py-1 rounded-md">
                    {game.category}
                  </span>
                )}
                {game.featured && (
                  <span className="text-xs font-bold uppercase tracking-wider text-accent-foreground bg-accent px-2.5 py-1 rounded-md shadow-sm">
                    Featured
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">{game.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                <button className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer" onClick={() => setLocation(`/profile/${game.authorId}`)}>
                  {game.author?.avatarUrl ? (
                    <img src={game.author.avatarUrl} alt={game.author.username} className="w-6 h-6 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center border border-border">
                      <UserIcon className="w-3 h-3" />
                    </div>
                  )}
                  {game.author?.username}
                </button>
                <span>&bull;</span>
                <span className="flex items-center gap-1.5">
                  <Play className="w-4 h-4" /> {game.playCount.toLocaleString()} plays
                </span>
              </div>
            </div>
            
            <div className="flex-shrink-0 pb-2 w-full md:w-auto">
              <Button size="lg" className="w-full md:w-auto font-bold h-14 px-8 text-lg shadow-md" onClick={() => setIsPlaying(true)}>
                <Play className="w-6 h-6 mr-2 fill-current" />
                Play Game
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <div className="md:col-span-2 space-y-8">
            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-4 text-foreground">
                About this game
              </h2>
              <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
                {game.description ? (
                  game.description.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-4 leading-relaxed">{paragraph}</p>
                  ))
                ) : (
                  <p className="italic">No description provided.</p>
                )}
              </div>
            </section>
          </div>
          
          <div className="space-y-6">
            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-foreground border-b border-border pb-3">Details</h3>
              <ul className="space-y-4 text-sm">
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2"><UserIcon className="w-4 h-4" /> Creator</span>
                  <span className="font-semibold text-foreground">{game.author?.username}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Published</span>
                  <span className="font-semibold text-foreground">{format(new Date(game.createdAt), "MMM d, yyyy")}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2"><Tag className="w-4 h-4" /> Genre</span>
                  <span className="font-semibold text-foreground">{game.category || "Uncategorized"}</span>
                </li>
              </ul>
              
              <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full bg-background" onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}>
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
                <a href={game.gameUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button variant="outline" className="w-full bg-background">
                    <ExternalLink className="w-4 h-4 mr-2" /> External
                  </Button>
                </a>
                {isOwner && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full col-span-2 bg-background text-destructive hover:text-destructive-foreground hover:bg-destructive border-destructive/40">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Game
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Bu oyunu silmek istediğine emin misin?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{game.title}" kalıcı olarak silinecek. Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={deleteGame.isPending}
                          onClick={() => deleteGame.mutate({ id: game.id })}
                        >
                          {deleteGame.isPending ? "Siliniyor..." : "Sil"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {isPlaying && (
        <GameOverlay
          title={game.title}
          gameUrl={game.gameUrl}
          onClose={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
}
