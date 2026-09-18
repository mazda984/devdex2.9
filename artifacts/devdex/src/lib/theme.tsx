import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_STYLE_ID, getStyleById } from "@/lib/styles";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  styleId: string;
  setStyleId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("devdex-theme") as Theme) ?? "dark";
    }
    return "dark";
  });

  const [styleId, setStyleIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("devdex-style") ?? DEFAULT_STYLE_ID;
    }
    return DEFAULT_STYLE_ID;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("devdex-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const style = getStyleById(styleId);

    // Önceki stilin efekt sınıfını temizle
    root.className
      .split(" ")
      .filter((c) => c.startsWith("style-"))
      .forEach((c) => root.classList.remove(c));

    root.setAttribute("data-style", style.id);
    if (style.effectClass) {
      root.classList.add(style.effectClass);
    }
    localStorage.setItem("devdex-style", style.id);
  }, [styleId]);

  const toggleTheme = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));
  const setTheme = (t: Theme) => setThemeState(t);
  const setStyleId = (id: string) => setStyleIdState(id);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, styleId, setStyleId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
