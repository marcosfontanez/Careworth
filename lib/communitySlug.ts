/**
 * Canonical community slug for URLs and React Query keys.
 * DB `communities.slug` values are stored lowercase; normalizing avoids cache
 * misses between prefetch (`primeCommunityDetailCache`) and `useCommunity`.
 */
export function normalizeCommunitySlug(raw: string | string[] | undefined | null): string {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return (s ?? '').trim().toLowerCase();
}
