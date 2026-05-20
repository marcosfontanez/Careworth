import type { LiveHubCategoryTab } from '@/types/liveHub';

const TAB_SET = new Set<string>([
  'for-you',
  'following',
  'casual',
  'gaming',
  'irl',
  'learn',
  'shop',
]);

/** Aliases for Universal Links / marketing copy (hyphenated slug → canonical tab id). */
const ALIASES: Record<string, LiveHubCategoryTab> = {
  'shop-live': 'shop',
  foryou: 'for-you',
};

/**
 * Normalize `?tab=` from deep links or route search params to a hub filter.
 * Accepts canonical ids (`shop`, `for-you`) and a few aliases (`shop-live`, `foryou`).
 */
export function normalizeLiveHubTabQueryParam(raw: string | undefined | null): LiveHubCategoryTab | null {
  if (raw == null || typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase().replace(/\s+/g, '-');
  if (!v) return null;
  const canonical = ALIASES[v] ?? (TAB_SET.has(v) ? (v as LiveHubCategoryTab) : null);
  return canonical ?? null;
}
