import React, { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Gamepad2, Home, X } from "lucide-react";
import FlappyBird from "@/components/FlappyBird";

export default function NotFound() {
  const [showMinigame, setShowMinigame] = useState(false);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4 py-12 gap-8">
      <div className="flex flex-col items-center text-center gap-4 max-w-md">
        <img
          src={`${import.meta.env.BASE_URL}assets/404-character.png`}
          alt="404"
          className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
        />
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Aradığınız sayfa geçerli değil
        </h1>
        <p className="text-sm text-muted-foreground">
          Bu sayfa taşınmış, silinmiş olabilir ya da hiç var olmamış olabilir.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full sm:w-auto">
          <Link href="/">
            <Button className="w-full sm:w-auto font-semibold">
              <Home className="w-4 h-4 mr-2" />
              Ana Sayfaya Dön
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full sm:w-auto font-semibold"
            onClick={() => setShowMinigame((v) => !v)}
          >
            <Gamepad2 className="w-4 h-4 mr-2" />
            Minigames
          </Button>
        </div>
      </div>

      {showMinigame && (
        <div className="relative bg-card border border-border rounded-2xl shadow-lg p-4 animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={() => setShowMinigame(false)}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
          <FlappyBird />
        </div>
      )}
    </div>
  );
}
