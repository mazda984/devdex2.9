import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "tr" | "ru";

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

// Small, flat translation dictionary. Keys are grouped by area (nav.*, home.*,
// settings.*, ...) so it's easy to find/extend. Add new keys here and use them
// anywhere in the app via t("key.name") from useI18n().
const dict: Record<Language, Record<string, string>> = {
  en: {
    "nav.browse": "Browse",
    "nav.groups": "Groups",
    "nav.catalog": "Catalog",
    "nav.submit": "Submit",
    "nav.studio": "Studio",
    "nav.admin": "Admin",
    "nav.login": "Login",
    "nav.signup": "Sign Up",
    "nav.messages": "Messages",
    "nav.logout": "Logout",

    "sidebar.home": "Home",
    "sidebar.profile": "Profile",
    "sidebar.messages": "Messages",
    "sidebar.friends": "Friends",
    "sidebar.avatar": "Avatar",
    "sidebar.inventory": "Inventory",
    "sidebar.groups": "Groups",
    "sidebar.feed": "My Feed",
    "sidebar.upgrade": "Get DexBux",

    "home.hello": "Hello, {name}!",
    "home.welcome": "Welcome to DevDex",
    "home.friends": "Friends",
    "home.seeAll": "See All",
    "home.noFriends": "No friends yet. Find people in Groups or Games!",
    "home.continue": "Continue",
    "home.recentActivity": "Friend Activity",
    "home.featured": "Featured Games",
    "home.recent": "Recently Added",
    "home.noFeatured": "No featured games available right now.",
    "home.noGames": "No games found. Be the first to submit one!",
    "home.viewAll": "View All",
    "home.playNow": "Play Now",
    "home.games": "Games Available",
    "home.players": "Active Players",
    "home.plays": "Total Plays",

    "settings.title": "Settings",
    "settings.subtitle": "Manage your account and preferences.",
    "settings.appearance": "Appearance",
    "settings.appearanceDesc": "Customize how DevDex looks on your device.",
    "settings.light": "Light Mode",
    "settings.dark": "Dark Mode",
    "settings.language": "Language",
    "settings.languageDesc": "Choose the language DevDex is displayed in.",
  },
  tr: {
    "nav.browse": "Keşfet",
    "nav.groups": "Gruplar",
    "nav.catalog": "Katalog",
    "nav.submit": "Oyun Ekle",
    "nav.studio": "Stüdyo",
    "nav.admin": "Yönetim",
    "nav.login": "Giriş Yap",
    "nav.signup": "Kayıt Ol",
    "nav.messages": "Mesajlar",
    "nav.logout": "Çıkış Yap",

    "sidebar.home": "Ana Sayfa",
    "sidebar.profile": "Profil",
    "sidebar.messages": "Mesajlar",
    "sidebar.friends": "Arkadaşlar",
    "sidebar.avatar": "Avatar",
    "sidebar.inventory": "Envanter",
    "sidebar.groups": "Gruplar",
    "sidebar.feed": "Akışım",
    "sidebar.upgrade": "DexBux Al",

    "home.hello": "Merhaba, {name}!",
    "home.welcome": "DevDex'e Hoş Geldin",
    "home.friends": "Arkadaşlar",
    "home.seeAll": "Tümünü Gör",
    "home.noFriends": "Henüz arkadaşın yok. Gruplarda ya da oyunlarda insanlarla tanış!",
    "home.continue": "Devam Et",
    "home.recentActivity": "Arkadaş Etkinliği",
    "home.featured": "Öne Çıkan Oyunlar",
    "home.recent": "Yeni Eklenenler",
    "home.noFeatured": "Şu anda öne çıkan oyun yok.",
    "home.noGames": "Hiç oyun bulunamadı. İlk ekleyen sen ol!",
    "home.viewAll": "Tümünü Gör",
    "home.playNow": "Hemen Oyna",
    "home.games": "Oyun Sayısı",
    "home.players": "Aktif Oyuncu",
    "home.plays": "Toplam Oynanma",

    "settings.title": "Ayarlar",
    "settings.subtitle": "Hesabını ve tercihlerini yönet.",
    "settings.appearance": "Görünüm",
    "settings.appearanceDesc": "DevDex'in cihazında nasıl göründüğünü özelleştir.",
    "settings.light": "Açık Tema",
    "settings.dark": "Koyu Tema",
    "settings.language": "Dil",
    "settings.languageDesc": "DevDex'in görüntüleneceği dili seç.",
  },
  ru: {
    "nav.browse": "Обзор",
    "nav.groups": "Группы",
    "nav.catalog": "Каталог",
    "nav.submit": "Добавить игру",
    "nav.studio": "Студия",
    "nav.admin": "Админ",
    "nav.login": "Войти",
    "nav.signup": "Регистрация",
    "nav.messages": "Сообщения",
    "nav.logout": "Выйти",

    "sidebar.home": "Главная",
    "sidebar.profile": "Профиль",
    "sidebar.messages": "Сообщения",
    "sidebar.friends": "Друзья",
    "sidebar.avatar": "Аватар",
    "sidebar.inventory": "Инвентарь",
    "sidebar.groups": "Группы",
    "sidebar.feed": "Моя лента",
    "sidebar.upgrade": "Получить DexBux",

    "home.hello": "Привет, {name}!",
    "home.welcome": "Добро пожаловать в DevDex",
    "home.friends": "Друзья",
    "home.seeAll": "Смотреть все",
    "home.noFriends": "Пока нет друзей. Найдите людей в группах или играх!",
    "home.continue": "Продолжить",
    "home.recentActivity": "Активность друзей",
    "home.featured": "Рекомендуемые игры",
    "home.recent": "Недавно добавленные",
    "home.noFeatured": "Сейчас нет рекомендуемых игр.",
    "home.noGames": "Игры не найдены. Добавьте первую!",
    "home.viewAll": "Смотреть все",
    "home.playNow": "Играть",
    "home.games": "Доступно игр",
    "home.players": "Активных игроков",
    "home.plays": "Всего игр сыграно",

    "settings.title": "Настройки",
    "settings.subtitle": "Управляйте своим аккаунтом и настройками.",
    "settings.appearance": "Внешний вид",
    "settings.appearanceDesc": "Настройте, как DevDex выглядит на вашем устройстве.",
    "settings.light": "Светлая тема",
    "settings.dark": "Тёмная тема",
    "settings.language": "Язык",
    "settings.languageDesc": "Выберите язык интерфейса DevDex.",
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (l: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function detectDefaultLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("devdex-language") as Language | null;
  if (stored && dict[stored]) return stored;
  const browser = navigator.language?.slice(0, 2);
  if (browser === "tr" || browser === "ru") return browser as Language;
  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectDefaultLanguage);

  useEffect(() => {
    localStorage.setItem("devdex-language", language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (l: Language) => setLanguageState(l);

  const t = (key: string, vars?: Record<string, string | number>) => {
    let str = dict[language]?.[key] ?? dict.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
