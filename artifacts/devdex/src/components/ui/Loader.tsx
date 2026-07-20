import React from "react";

export function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-r-2 border-accent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.7s' }}></div>
        <div className="absolute inset-4 rounded-full border-b-2 border-foreground animate-spin" style={{ animationDuration: '1.5s' }}></div>
      </div>
      <span className="font-mono text-xs tracking-widest text-primary animate-pulse">LOADING...</span>
    </div>
  );
}
