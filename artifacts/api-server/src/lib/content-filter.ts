// Lightweight keyword-based filter to block obviously adult/sexual content
// in game titles and descriptions at submission time. This is NOT a
// substitute for real image/content moderation — it's a first line of
// defense, backed up by the user report system + admin review.
const BLOCKED_TERMS = [
  "porn",
  "porno",
  "xxx",
  "sex",
  "seks",
  "nsfw",
  "nude",
  "nudity",
  "çıplak",
  "erotic",
  "erotik",
  "hentai",
  "fetish",
  "fetiş",
  "onlyfans",
  "18+",
  "adult content",
  "yetişkin içerik",
];

export function containsAdultContent(...texts: (string | null | undefined)[]): boolean {
  const combined = texts.filter(Boolean).join(" ").toLowerCase();
  return BLOCKED_TERMS.some((term) => combined.includes(term));
}
