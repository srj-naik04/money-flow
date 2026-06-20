export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}

/** Pick a slug not present in `taken`, appending -2, -3, ... as needed. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let i = 2;
  let candidate = `${base}-${i}`;
  while (taken.has(candidate)) {
    i += 1;
    candidate = `${base}-${i}`;
  }
  return candidate;
}
