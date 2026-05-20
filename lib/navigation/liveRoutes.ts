import type { Href } from 'expo-router';
import type { LiveHubSection } from '@/lib/liveHubSectionParam';
import type { LiveHubCategoryTab } from '@/types/liveHub';

/** Typed navigation targets for Live (`app/live/*`) and the tab hub (`(tabs)/live`). */

export type LiveHubHrefOpts = {
  tab?: LiveHubCategoryTab | null;
  section?: LiveHubSection | null;
};

function liveHubHrefFromOpts(opts: LiveHubHrefOpts): Href {
  const q = new URLSearchParams();
  if (opts.tab != null && opts.tab !== 'for-you') q.set('tab', opts.tab);
  if (opts.section) q.set('section', opts.section);
  const qs = q.toString();
  return (qs ? `/(tabs)/live?${qs}` : '/(tabs)/live') as Href;
}

/**
 * Live hub (`(tabs)/live`): optional discover tab + optional scroll section (`featured`, `discover`, `shop`, `upcoming`).
 * Call `liveHubHref('shop')` or `liveHubHref({ tab: 'shop', section: 'upcoming' })`.
 */
export function liveHubHref(tabOrOpts?: LiveHubCategoryTab | null | LiveHubHrefOpts): Href {
  if (tabOrOpts == null || tabOrOpts === 'for-you') return '/(tabs)/live' as Href;
  if (typeof tabOrOpts === 'object') return liveHubHrefFromOpts(tabOrOpts);
  return `/(tabs)/live?tab=${encodeURIComponent(tabOrOpts)}` as Href;
}

export function liveStreamHref(streamId: string): Href {
  return `/live/${encodeURIComponent(streamId)}` as Href;
}

export function liveGoLiveHref(): Href {
  return '/live/go-live' as Href;
}

export function liveHostControlsHref(opts?: { demo?: boolean }): Href {
  if (opts?.demo) return '/live/host-controls?demo=1' as Href;
  return '/live/host-controls' as Href;
}

export function liveHighlightsHref(streamId: string): Href {
  return `/live/highlights?streamId=${encodeURIComponent(streamId)}` as Href;
}

/** Highlights sheet without a stream context (info-only). */
export function liveHighlightsRootHref(): Href {
  return '/live/highlights' as Href;
}
