/**
 * iTunes Search API — tiny client used to power the "Current Vibe" song
 * picker in Customize My Pulse.
 *
 * Why iTunes Search?
 * - Free, no API key, no auth, globally available
 * - Returns a public 30-second `.m4a` preview URL per track, which is a
 *   real direct-audio URL our `FeaturedSoundCard` can stream for autoplay
 *   when someone visits the owner's Pulse Page
 * - Includes high-resolution artwork, canonical track & artist names, and
 *   a `trackViewUrl` we can fall back to as an external "listen" link
 *
 * Docs: https://performance-partners.apple.com/search-api
 */

export interface ITunesSongHit {
  /** Apple track id — stable across searches; used as React list key. */
  id: string;
  title: string;
  artist: string;
  /** 30-second `.m4a` preview URL (direct audio, autoplayable). */
  previewUrl: string;
  /** Upgraded-resolution album artwork URL (600x600 JPG). */
  artworkUrl: string;
  /** Apple / iTunes page — deep-links into Music / iTunes apps. */
  trackViewUrl: string;
  /** Track duration in milliseconds when provided by the API. */
  durationMs?: number;
  /** Album / collection name, useful as secondary context. */
  collectionName?: string;
}

interface RawITunesResult {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
  artworkUrl30?: string;
  trackViewUrl?: string;
  collectionName?: string;
  trackTimeMillis?: number;
  kind?: string;
}

/**
 * Upgrade iTunes' default 100x100 artwork URL to a crisper 600x600 so it
 * reads cleanly inside the player card. iTunes artwork URLs are hashed
 * paths that end in `<size>x<size>bb.jpg`, so we can do this via regex.
 */
function upgradeArtworkSize(url: string, px: number = 600): string {
  if (!url) return url;
  return url.replace(/\/\d+x\d+bb\.(jpg|png)/i, `/${px}x${px}bb.$1`);
}

/**
 * Search iTunes for songs matching `query`. Results are filtered to
 * the `song` kind and to rows that actually have a preview URL — a
 * small but important detail since regional catalog gaps occasionally
 * return rows with no streamable preview, and we can't use those.
 *
 * Network errors are swallowed and returned as an empty list so the
 * picker UI can render an empty-state instead of crashing the screen.
 */
export async function searchITunesSongs(
  query: string,
  limit: number = 20,
): Promise<ITunesSongHit[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('media', 'music');
  url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', String(Math.max(1, Math.min(limit, 50))));
  url.searchParams.set('term', q);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: RawITunesResult[] };
    const rows = json.results ?? [];

    const out: ITunesSongHit[] = [];
    for (const r of rows) {
      if (r.kind && r.kind !== 'song') continue;
      const previewUrl = r.previewUrl?.trim() ?? '';
      if (!previewUrl) continue;
      const artwork =
        r.artworkUrl100 ?? r.artworkUrl60 ?? r.artworkUrl30 ?? '';
      out.push({
        id: String(r.trackId ?? `${r.trackName}-${r.artistName}`),
        title: r.trackName?.trim() ?? '',
        artist: r.artistName?.trim() ?? '',
        previewUrl,
        artworkUrl: upgradeArtworkSize(artwork, 600),
        trackViewUrl: r.trackViewUrl ?? '',
        durationMs: r.trackTimeMillis,
        collectionName: r.collectionName,
      });
    }
    return out;
  } catch {
    return [];
  }
}
