/**
 * Series mode — chain posts as Part 1, 2, 3 of a longer story. The series_id
 * is shared across parts so the feed can render a "Next part →" overlay and
 * the discover shelf can group them.
 */

import { supabase } from '@/lib/supabase';

export interface SeriesPost {
  id: string;
  caption: string;
  thumbnail_url: string | null;
  media_url: string | null;
  series_id: string | null;
  series_part: number | null;
  series_total: number | null;
  created_at: string;
}

/** Generate a v4-ish UUID without pulling in `expo-crypto`. */
export function newSeriesId(): string {
  // Good-enough random uuid for a client-generated series_id.
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return (
    [...bytes.slice(0, 4)].map(hex).join('') + '-' +
    [...bytes.slice(4, 6)].map(hex).join('') + '-' +
    [...bytes.slice(6, 8)].map(hex).join('') + '-' +
    [...bytes.slice(8, 10)].map(hex).join('') + '-' +
    [...bytes.slice(10, 16)].map(hex).join('')
  );
}

/** Fetch the user's most recent series (last 30d) for the picker. */
export async function listRecentSeries(userId: string, limit = 8): Promise<SeriesPost[]> {
  const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('id, caption, thumbnail_url, media_url, series_id, series_part, series_total, created_at')
      .eq('creator_id', userId)
      .not('series_id', 'is', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(80);
    if (error || !data) return [];
    // Collapse to most recent post per series_id.
    const seen = new Set<string>();
    const out: SeriesPost[] = [];
    for (const row of data) {
      if (!row.series_id) continue;
      if (seen.has(row.series_id)) continue;
      seen.add(row.series_id);
      out.push(row as SeriesPost);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

export interface SeriesSelection {
  seriesId: string;
  seriesPart: number;
  seriesTotal: number;
}

export function nextPartOf(existing: SeriesPost): SeriesSelection {
  const part = (existing.series_part ?? 1) + 1;
  const total = Math.max(existing.series_total ?? part, part);
  return {
    seriesId: existing.series_id!,
    seriesPart: part,
    seriesTotal: total,
  };
}

export function startNewSeries(opts: { totalPlanned?: number } = {}): SeriesSelection {
  return {
    seriesId: newSeriesId(),
    seriesPart: 1,
    seriesTotal: Math.max(1, opts.totalPlanned ?? 1),
  };
}
