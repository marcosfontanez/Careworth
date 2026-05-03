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

export interface ITunesSearchOpts {
  /** Per-request max is 200 for search; we cap at 50 to match API guidance. */
  limit?: number;
  offset?: number;
  /** ISO 3166-1 alpha-2 store country (e.g. US, GB). */
  country?: string;
}

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

export interface ITunesAlbumHit {
  id: string;
  collectionId: number;
  title: string;
  artist: string;
  artworkUrl: string;
}

export interface ITunesArtistHit {
  id: string;
  artistId: number;
  name: string;
  artworkUrl: string;
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
  collectionId?: number;
  artistId?: number;
  trackTimeMillis?: number;
  kind?: string;
  wrapperType?: string;
}

function normalizeOpts(limitOrOpts?: number | ITunesSearchOpts): ITunesSearchOpts {
  if (typeof limitOrOpts === 'number') {
    return { limit: limitOrOpts };
  }
  return limitOrOpts ?? {};
}

/**
 * Best-effort storefront from runtime locale (no extra native deps).
 */
export function getStorefrontCountry(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const m = locale.match(/-([A-Za-z]{2})$/);
    if (m) return m[1].toUpperCase();
  } catch {
    /* noop */
  }
  return 'US';
}

function applyStoreParams(url: URL, opts: ITunesSearchOpts) {
  url.searchParams.set('country', opts.country ?? getStorefrontCountry());
  const off = opts.offset ?? 0;
  if (off > 0) {
    url.searchParams.set('offset', String(Math.min(off, 200)));
  }
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

function mapRawToSongHit(r: RawITunesResult): ITunesSongHit | null {
  if (r.kind && r.kind !== 'song') return null;
  const previewUrl = r.previewUrl?.trim() ?? '';
  if (!previewUrl) return null;
  const artwork = r.artworkUrl100 ?? r.artworkUrl60 ?? r.artworkUrl30 ?? '';
  return {
    id: String(r.trackId ?? `${r.trackName}-${r.artistName}`),
    title: r.trackName?.trim() ?? '',
    artist: r.artistName?.trim() ?? '',
    previewUrl,
    artworkUrl: upgradeArtworkSize(artwork, 600),
    trackViewUrl: r.trackViewUrl ?? '',
    durationMs: r.trackTimeMillis,
    collectionName: r.collectionName,
  };
}

/**
 * Search iTunes for songs matching `query`. Results are filtered to
 * rows that actually have a preview URL — regional catalog gaps occasionally
 * return rows with no streamable preview, and we can't use those.
 */
export async function searchITunesSongs(
  query: string,
  limitOrOpts?: number | ITunesSearchOpts,
): Promise<ITunesSongHit[]> {
  const opts = normalizeOpts(limitOrOpts);
  const q = query.trim();
  if (!q) return [];

  const lim = Math.max(1, Math.min(opts.limit ?? 25, 50));
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('media', 'music');
  url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', String(lim));
  url.searchParams.set('term', q);
  applyStoreParams(url, opts);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: RawITunesResult[] };
    const rows = json.results ?? [];

    const out: ITunesSongHit[] = [];
    for (const r of rows) {
      const hit = mapRawToSongHit(r);
      if (hit) out.push(hit);
    }
    return out;
  } catch {
    return [];
  }
}

/** Album browse step — tap-through loads previewable tracks via lookup. */
export async function searchITunesAlbums(
  query: string,
  limitOrOpts?: number | ITunesSearchOpts,
): Promise<ITunesAlbumHit[]> {
  const opts = normalizeOpts(limitOrOpts);
  const q = query.trim();
  if (!q) return [];

  const lim = Math.max(1, Math.min(opts.limit ?? 25, 50));
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('media', 'music');
  url.searchParams.set('entity', 'album');
  url.searchParams.set('limit', String(lim));
  url.searchParams.set('term', q);
  applyStoreParams(url, opts);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: RawITunesResult[] };
    const rows = json.results ?? [];

    const out: ITunesAlbumHit[] = [];
    for (const r of rows) {
      if (!r.collectionId || r.trackId) continue;
      if (r.kind === 'song') continue;
      const art = r.artworkUrl100 ?? r.artworkUrl60 ?? r.artworkUrl30 ?? '';
      out.push({
        id: String(r.collectionId),
        collectionId: r.collectionId,
        title: r.collectionName?.trim() ?? 'Album',
        artist: r.artistName?.trim() ?? '',
        artworkUrl: upgradeArtworkSize(art, 600),
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Artist browse step — tap-through loads previewable tracks via lookup. */
export async function searchITunesArtists(
  query: string,
  limitOrOpts?: number | ITunesSearchOpts,
): Promise<ITunesArtistHit[]> {
  const opts = normalizeOpts(limitOrOpts);
  const q = query.trim();
  if (!q) return [];

  const lim = Math.max(1, Math.min(opts.limit ?? 25, 50));
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('media', 'music');
  url.searchParams.set('entity', 'musicArtist');
  url.searchParams.set('limit', String(lim));
  url.searchParams.set('term', q);
  applyStoreParams(url, opts);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: RawITunesResult[] };
    const rows = json.results ?? [];

    const out: ITunesArtistHit[] = [];
    for (const r of rows) {
      if (!r.artistId || r.trackId) continue;
      const art = r.artworkUrl100 ?? r.artworkUrl60 ?? r.artworkUrl30 ?? '';
      out.push({
        id: String(r.artistId),
        artistId: r.artistId,
        name: r.artistName?.trim() ?? 'Artist',
        artworkUrl: art ? upgradeArtworkSize(art, 600) : '',
      });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Fetch tracks for an album (`collectionId`) or an `artistId` using Lookup API.
 * Only songs with preview URLs are returned.
 */
export async function lookupITunesSongs(params: {
  collectionId?: number;
  artistId?: number;
  limit?: number;
  country?: string;
}): Promise<ITunesSongHit[]> {
  const id = params.collectionId ?? params.artistId;
  if (id == null || Number.isNaN(id)) return [];

  const lim = Math.max(1, Math.min(params.limit ?? 100, 200));
  const url = new URL('https://itunes.apple.com/lookup');
  url.searchParams.set('id', String(id));
  url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', String(lim));
  url.searchParams.set('country', params.country ?? getStorefrontCountry());

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: RawITunesResult[] };
    const rows = json.results ?? [];

    const out: ITunesSongHit[] = [];
    for (const r of rows) {
      const hit = mapRawToSongHit(r);
      if (hit) out.push(hit);
    }
    return out;
  } catch {
    return [];
  }
}
