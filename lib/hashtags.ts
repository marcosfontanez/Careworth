/**
 * Shared hashtag helpers used by create flows (image carousel, video composer,
 * text post composer, Circle composer). Pairs with `search_hashtags` RPC from
 * migration 236 and `<HashtagInput>` in `components/create/HashtagInput.tsx`.
 *
 * Design goals (Creator Hub audit issue #8):
 *   • Strict 5-hashtag cap per post.
 *   • Lowercase, alphanumeric + underscore only — strip `#`, whitespace, emoji.
 *   • Suggestions ranked by usage_count via the RPC.
 *   • Duplicate-safe (case-insensitive).
 */

import { supabase } from '@/lib/supabase';

/** Hard product cap — surfaced to the user as "max 5 hashtags". */
export const HASHTAG_MAX = 5;

/** Match what migration 236 `normalize_hashtag` produces server-side. */
export function normalizeHashtag(input: string | null | undefined): string {
  if (!input) return '';
  const trimmed = input.trim().replace(/^#+/, '');
  if (!trimmed) return '';
  /** Lowercase, then strip anything that isn't [a-z0-9_]. */
  return trimmed.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

/** Pull `#tags` out of caption-style text. Returns normalized, deduped, capped list. */
export function parseHashtagsFromText(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const matches = raw.match(/#[A-Za-z0-9_]+/g) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const n = normalizeHashtag(m);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= HASHTAG_MAX) break;
  }
  return out;
}

/**
 * Merge new tag into existing list. Dedup (case-insensitive), normalize,
 * cap at HASHTAG_MAX. Named `addHashtagToList` to avoid colliding with the
 * pre-existing string-based `appendHashtag` in `lib/hashtagStudio.ts`.
 */
export function addHashtagToList(existing: string[], incoming: string): string[] {
  const n = normalizeHashtag(incoming);
  if (!n) return existing;
  const set = new Set(existing.map((t) => normalizeHashtag(t)).filter(Boolean));
  if (set.has(n)) return existing;
  if (existing.length >= HASHTAG_MAX) return existing;
  return [...existing, n];
}

/** Same as addHashtagToList but operating on a single space-separated string. */
export function syncHashtagsToString(tags: string[]): string {
  return tags
    .map((t) => normalizeHashtag(t))
    .filter(Boolean)
    .slice(0, HASHTAG_MAX)
    .map((t) => `#${t}`)
    .join(' ');
}

export type HashtagSuggestion = {
  tag: string;
  usageCount: number;
};

/**
 * Calls `public.search_hashtags(p_prefix, p_limit)`. Returns ranked tags or an
 * empty array on error (suggestions are an enhancement; failures must never
 * break the composer).
 */
export async function searchHashtags(prefix: string, limit = 8): Promise<HashtagSuggestion[]> {
  const p = normalizeHashtag(prefix);
  if (!p) return [];
  try {
    const { data, error } = await supabase.rpc('search_hashtags', {
      p_prefix: p,
      p_limit: Math.max(1, Math.min(25, limit)),
    });
    if (error) {
      if (__DEV__) console.warn('[hashtags] search_hashtags rpc error', error.message);
      return [];
    }
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => {
        const tag = typeof row?.tag === 'string' ? row.tag : '';
        const count = typeof row?.usage_count === 'number' ? row.usage_count : 0;
        if (!tag) return null;
        return { tag, usageCount: count } satisfies HashtagSuggestion;
      })
      .filter((x): x is HashtagSuggestion => x !== null);
  } catch (e) {
    if (__DEV__) console.warn('[hashtags] search_hashtags threw', e);
    return [];
  }
}

/** Lightweight number formatter for chip badges (1.2k, 12k, 1.2M). */
export function formatHashtagUsage(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1)}k`;
  return String(Math.floor(count));
}
