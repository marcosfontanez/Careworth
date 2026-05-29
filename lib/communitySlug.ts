/**
 * Canonical community slug for URLs and React Query keys.
 * DB `communities.slug` values are stored lowercase; normalizing avoids cache
 * misses between prefetch (`primeCommunityDetailCache`) and `useCommunity`.
 */
export function normalizeCommunitySlug(raw: string | string[] | undefined | null): string {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const base = (s ?? '').trim().toLowerCase();
  if (base === 'shift-confessions') return 'confessions';
  return base;
}

/** `icu-nursing` → `ICU Nursing` for display when only slug is available. */
export function humanizeCommunitySlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 3 && /^[a-z]+$/i.test(part)) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}
