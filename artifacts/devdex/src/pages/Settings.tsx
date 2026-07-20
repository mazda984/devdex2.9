import React from "react";
import { useTheme } from "@/lib/theme";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl flex-1">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2 text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <div className="grid gap-8">
        <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold mb-1">Appearance</h2>
            <p className="text-sm text-muted-foreground">
              Customize how DevDex looks on your device.
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${
                  theme === "light" 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Sun className="w-8 h-8" />
                </div>
                <span className="font-medium">Light Mode</span>
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${
                  theme === "dark" 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Moon className="w-8 h-8" />
                </div>
                <span className="font-medium">Dark Mode</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
