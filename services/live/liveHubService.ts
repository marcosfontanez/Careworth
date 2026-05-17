import { isFeatureEnabled } from '@/lib/featureFlags';
import { streamsService } from '@/services/streams';
import type { LiveHubCategoryTab, LiveHubHomePayload, LiveHubStream } from '@/types/liveHub';
import { liveStreamToHub } from '@/types/liveHub';
import { DEMO_LIVE_STREAMS, DEMO_UPCOMING_SESSIONS } from '@/services/live/mockLiveHubData';

function dedupeStreams(list: LiveHubStream[]): LiveHubStream[] {
  const seen = new Set<string>();
  const out: LiveHubStream[] = [];
  for (const s of list) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}

function mergeWithDemos(real: LiveHubStream[]): LiveHubStream[] {
  if (!isFeatureEnabled('liveDiscoveryDemos')) return real;
  return dedupeStreams([...real, ...DEMO_LIVE_STREAMS]);
}

function filterForTab(tab: LiveHubCategoryTab, streams: LiveHubStream[]): LiveHubStream[] {
  switch (tab) {
    case 'for-you':
      return streams;
    case 'following':
      return streams.filter((s) => s.isFollowingHost);
    case 'gaming':
      return streams.filter((s) => s.liveType === 'gaming');
    case 'irl':
      return streams.filter((s) => s.liveType === 'irl');
    case 'learn':
      return streams.filter((s) => s.liveType === 'learn');
    case 'shop':
      return streams.filter((s) => s.liveType === 'shop' || s.hasProducts);
    default:
      return streams;
  }
}

function sortByViewers(a: LiveHubStream, b: LiveHubStream): number {
  return b.viewerCount - a.viewerCount;
}

/**
 * Discovery payload for the Live hub tab. Merges DB-backed streams with optional
 * demo rows (`liveDiscoveryDemos` flag) for founder previews.
 */
export async function fetchLiveHubHome(tab: LiveHubCategoryTab): Promise<LiveHubHomePayload> {
  const { live } = await streamsService.getAllStreams();
  const realHub = live.map((s) => liveStreamToHub(s));
  const merged = mergeWithDemos(realHub).sort(sortByViewers);
  const allFiltered = filterForTab(tab, merged);

  const featuredPool = [...allFiltered].sort((a, b) => {
    const af = a.isFeatured ? 1 : 0;
    const bf = b.isFeatured ? 1 : 0;
    if (bf !== af) return bf - af;
    return b.viewerCount - a.viewerCount;
  });

  const featured = featuredPool.slice(0, 5);
  const trending = allFiltered.filter((s) => !featured.some((f) => f.id === s.id)).slice(0, 8);

  const shopLiveDeals = filterForTab(
    'shop',
    merged,
  ).slice(0, 12);

  const circleLives = DEMO_LIVE_STREAMS.filter(
    (s) => s.communityName || s.tags.some((t) => /circle/i.test(t)),
  ).slice(0, 6);

  return {
    tab,
    featured,
    trending,
    shopLiveDeals,
    upcoming: DEMO_UPCOMING_SESSIONS,
    circleLives,
    allFiltered,
  };
}

export async function getLiveHubStreamById(id: string): Promise<LiveHubStream | null> {
  const fromDemo = DEMO_LIVE_STREAMS.find((s) => s.id === id);
  if (fromDemo) return fromDemo;
  const row = await streamsService.getStreamById(id);
  return row ? liveStreamToHub(row) : null;
}

/** @deprecated Prefer `fetchLiveHubHome` — kept for grep-friendly API parity with spec. */
export async function getFeaturedLiveStreams(): Promise<LiveHubStream[]> {
  const home = await fetchLiveHubHome('for-you');
  return home.featured;
}

export async function getLiveStreamsByCategory(tab: LiveHubCategoryTab): Promise<LiveHubStream[]> {
  const home = await fetchLiveHubHome(tab);
  return home.allFiltered;
}

export async function getUpcomingLiveSessions() {
  return DEMO_UPCOMING_SESSIONS;
}
