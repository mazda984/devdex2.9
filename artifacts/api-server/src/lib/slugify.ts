export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uniqueSlug(
  base: string,
  existsCheck?: (slug: string) => Promise<boolean>,
): Promise<string> {
  const suffix = Math.random().toString(36).slice(2, 7);
  let slug = `${slugify(base)}-${suffix}`;

  if (existsCheck) {
    // Extremely unlikely to collide given the random suffix, but retry a
    // few times just in case.
    let attempts = 0;
    while ((await existsCheck(slug)) && attempts < 5) {
      slug = `${slugify(base)}-${Math.random().toString(36).slice(2, 7)}`;
      attempts++;
    }
  }

  return slug;
}
