import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Gamepad2, UserCircle, LogOut, PlusSquare, Search, Wrench, Settings as SettingsIcon, Sun, Moon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105 active:scale-95">
            <div className="bg-primary p-1.5 rounded-lg text-primary-foreground group-hover:bg-primary/90 transition-colors shadow-sm">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">
              DevDex
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/games" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
              <Search className="w-4 h-4" />
              Browse
            </Link>
            <Link href="/groups" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Groups
            </Link>
            <Link href="/submit" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
              <PlusSquare className="w-4 h-4" />
              Submit
            </Link>
            <Link href="/studio" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
              <Wrench className="w-4 h-4" />
              Studio
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          
          <Link href="/settings" className="hidden sm:flex text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-secondary">
            <SettingsIcon className="w-5 h-5" />
          </Link>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href={`/profile/${user.id}`} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <span className="hidden sm:inline-block">{user.username}</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout" className="text-muted-foreground hover:text-destructive">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                Login
              </Link>
              <Link href="/register">
                <Button size="sm" className="font-semibold shadow-sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
