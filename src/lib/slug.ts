/**
 * Converts user-facing text into a URL-safe slug.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Adds a random suffix so independently-created records cannot collide on a
 * tenant's unique slug constraint.
 */
export function createUniqueSlug(value: string): string {
  const base = slugify(value) || "artigo";
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  return `${base}-${suffix}`;
}
