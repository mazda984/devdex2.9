import React from "react";
import { Link } from "wouter";
import { Box, LayoutGrid } from "lucide-react";

export default function Studio() {
  return (
    <div className="container mx-auto px-4 py-16 flex-1 flex flex-col items-center">
      <div className="max-w-2xl text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-3">Studio</h1>
        <p className="text-muted-foreground text-lg">
          Oyununu nasıl yapmak istersin?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
        <Link href="/studio/2d">
          <div className="group cursor-pointer bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center gap-4 hover:border-primary hover:-translate-y-1 transition-all shadow-sm h-full">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">2D Studio</h2>
            <p className="text-muted-foreground text-sm">
              Klasik 2D oyun editörü. Sprite'lar, seviyeler ve daha fazlasıyla hızlıca 2D oyun yap.
            </p>
          </div>
        </Link>

        <Link href="/studio/3d">
          <div className="group cursor-pointer bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center gap-4 hover:border-primary hover:-translate-y-1 transition-all shadow-sm h-full">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Box className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">3D Studio</h2>
            <p className="text-muted-foreground text-sm">
              Serbest kamerayla (noclip) baseplate üzerinde Part ve Spawn Point yerleştirerek 3D bir dünya inşa et.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
