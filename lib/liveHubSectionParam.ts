export type LiveHubSection = 'featured' | 'discover' | 'shop' | 'upcoming';

const SECTION_SET = new Set<string>(['featured', 'discover', 'shop', 'upcoming']);

/** Normalize `?section=` for Live hub scroll targets (deep links + in-app). */
export function normalizeLiveHubSectionQueryParam(raw: string | undefined | null): LiveHubSection | null {
  if (raw == null || typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase().replace(/\s+/g, '-');
  if (!v) return null;
  return SECTION_SET.has(v) ? (v as LiveHubSection) : null;
}
