import React from "react";
import { useTheme } from "@/lib/theme";
import { useI18n, LANGUAGES } from "@/lib/i18n";
import { Moon, Sun, Check } from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl flex-1">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2 text-foreground">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-8">
        <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold mb-1">{t("settings.appearance")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("settings.appearanceDesc")}
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
                <span className="font-medium">{t("settings.light")}</span>
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
                <span className="font-medium">{t("settings.dark")}</span>
              </button>
            </div>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold mb-1">{t("settings.language")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("settings.languageDesc")}
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {LANGUAGES.map((lng) => (
                <button
                  key={lng.code}
                  onClick={() => setLanguage(lng.code)}
                  className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${
                    language === lng.code
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {language === lng.code && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <span className="text-3xl mb-3">{lng.flag}</span>
                  <span className="font-medium">{lng.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
