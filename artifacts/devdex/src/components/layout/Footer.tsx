import React from "react";
import { Link } from "wouter";
import { Gamepad2, Github, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/30 py-12 mt-auto">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2 space-y-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg text-primary-foreground shadow-sm">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg text-foreground">DevDex</span>
          </Link>
          <p className="text-muted-foreground text-sm max-w-sm">
            Discover and play thousands of browser games. No downloads needed. Build, share, and connect.
          </p>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Platform</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/games" className="hover:text-primary transition-colors">Browse Games</Link></li>
            <li><Link href="/groups" className="hover:text-primary transition-colors">Groups</Link></li>
            <li><Link href="/submit" className="hover:text-primary transition-colors">Submit a Game</Link></li>
            <li><Link href="/studio" className="hover:text-primary transition-colors">DevDex Studio</Link></li>
            <li><Link href="/settings" className="hover:text-primary transition-colors">Settings</Link></li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Connect</h3>
          <div className="flex gap-4">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors p-2 bg-secondary rounded-full">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors p-2 bg-secondary rounded-full">
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground font-medium">
        &copy; {new Date().getFullYear()} DevDex. All rights reserved.
      </div>
    </footer>
  );
}
