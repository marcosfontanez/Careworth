import { supabase } from '@/lib/supabase';

export type AppleMusicSongHit = {
  id: string;
  title: string;
  artist: string;
  url: string | null;
};

let cachedDevToken: { token: string; exp: number } | null = null;

const MEMORY_CACHE_MS = 5 * 60 * 1000;

const DEFAULT_STOREFRONT = (process.env.EXPO_PUBLIC_APPLE_MUSIC_STOREFRONT ?? 'us').toLowerCase();

async function getDeveloperToken(): Promise<string | null> {
  if (cachedDevToken && cachedDevToken.exp > Date.now()) {
    return cachedDevToken.token;
  }

  const { data, error } = await supabase.functions.invoke<{
    token?: string;
    expires_in?: number;
    error?: string;
  }>('apple-music-developer-token', { body: {} });

  if (error) {
    console.warn('Apple Music developer token:', error.message);
    return null;
  }

  if (!data?.token) {
    console.warn('Apple Music developer token:', data?.error ?? 'empty response');
    return null;
  }

  const ttlSec = data.expires_in ?? 12_960_000;
  const ttlMs = Math.min(ttlSec * 1000, MEMORY_CACHE_MS);
  cachedDevToken = { token: data.token, exp: Date.now() + ttlMs };
  return data.token;
}

/**
 * Search Apple Music catalog (songs). Requires Supabase Edge Function `apple-music-developer-token`
 * with Apple Music API keys. Does not access the user's library or live playback (needs MusicKit).
 */
export async function searchAppleMusicSongs(
  query: string,
  storefront: string = DEFAULT_STOREFRONT,
): Promise<AppleMusicSongHit[]> {
  const q = query.trim();
  if (!q) return [];

  const token = await getDeveloperToken();
  if (!token) return [];

  const url = new URL(
    `https://api.music.apple.com/v1/catalog/${encodeURIComponent(storefront)}/search`,
  );
  url.searchParams.set('types', 'songs');
  url.searchParams.set('limit', '12');
  url.searchParams.set('term', q);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Apple Music search failed (${res.status})`);
  }

  const json = (await res.json()) as {
    results?: {
      songs?: {
        data?: {
          id: string;
          attributes?: { name?: string; artistName?: string; url?: string };
        }[];
      };
    };
  };

  const rows = json.results?.songs?.data ?? [];
  return rows.map((row) => ({
    id: row.id,
    title: row.attributes?.name ?? '',
    artist: row.attributes?.artistName ?? '',
    url: row.attributes?.url ?? null,
  }));
}

export function getAppleMusicStorefront(): string {
  return DEFAULT_STOREFRONT;
}
