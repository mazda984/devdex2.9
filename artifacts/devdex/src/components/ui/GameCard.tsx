import React from "react";
import { Link } from "wouter";
import { Play, Eye, Clock, Star, Gamepad2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Game } from "@workspace/api-client-react";

interface GameCardProps {
  game: Game;
  priority?: boolean;
  onDelete?: (game: Game) => void;
}

export default function GameCard({ game, priority = false, onDelete }: GameCardProps) {
  return (
    <Link href={`/games/${game.id}`}>
      <div className="group relative rounded-xl overflow-hidden bg-card border border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col h-full cursor-pointer">
        <div className="aspect-video relative overflow-hidden bg-secondary">
          {game.coverImageUrl ? (
            <img 
              src={game.coverImageUrl} 
              alt={game.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading={priority ? "eager" : "lazy"}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary/80">
              <Gamepad2 className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {game.featured && (
            <div className="absolute top-3 right-3 bg-accent text-accent-foreground text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 fill-current" />
              FEATURED
            </div>
          )}

          {onDelete && (
            <button
              type="button"
              aria-label="Oyunu sil"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(game);
              }}
              className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-destructive text-white flex items-center justify-center transition-colors shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-md">
              <Play className="w-6 h-6 ml-1 fill-current" />
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors text-foreground">
              {game.title}
            </h3>
            {game.category && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-full whitespace-nowrap">
                {game.category}
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {game.description || "No description provided."}
          </p>
          
          <div className="mt-auto pt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-secondary border border-border overflow-hidden">
                {game.author?.avatarUrl ? (
                  <img src={game.author.avatarUrl} alt={game.author.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {game.author?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="font-medium hover:text-foreground transition-colors truncate max-w-[100px]">
                {game.author?.username}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-medium">
                <Play className="w-3.5 h-3.5" />
                {game.playCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
