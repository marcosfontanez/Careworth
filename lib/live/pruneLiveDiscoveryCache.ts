import type { QueryClient } from '@tanstack/react-query';

import { liveEndStreamDebug } from '@/lib/live/liveEndStreamDebug';
import type { LiveStream } from '@/types';
import type { LiveHubHomePayload } from '@/types/liveHub';

function stripId<T extends { id: string }>(list: T[], streamId: string): T[] {
  return list.filter((s) => s.id !== streamId);
}

function safeHubLists(old: LiveHubHomePayload): LiveHubHomePayload {
  return {
    ...old,
    happeningNow: Array.isArray(old.happeningNow) ? old.happeningNow : [],
    featured: Array.isArray(old.featured) ? old.featured : [],
    trending: Array.isArray(old.trending) ? old.trending : [],
    shopLiveDeals: Array.isArray(old.shopLiveDeals) ? old.shopLiveDeals : [],
    circleLives: Array.isArray(old.circleLives) ? old.circleLives : [],
    allFiltered: Array.isArray(old.allFiltered) ? old.allFiltered : [],
  };
}

/** Optimistically drop an ended stream from Live hub + live list caches. */
export function pruneStreamFromLiveDiscovery(queryClient: QueryClient, streamId: string): void {
  queryClient.setQueriesData<LiveHubHomePayload>({ queryKey: ['liveHub'] }, (old) => {
    if (!old) return old;
    const safe = safeHubLists(old);
    return {
      ...safe,
      happeningNow: stripId(safe.happeningNow, streamId),
      featured: stripId(safe.featured, streamId),
      trending: stripId(safe.trending, streamId),
      shopLiveDeals: stripId(safe.shopLiveDeals, streamId),
      circleLives: stripId(safe.circleLives, streamId),
      allFiltered: stripId(safe.allFiltered, streamId),
    };
  });

  queryClient.setQueriesData<{ live: LiveStream[]; scheduled: LiveStream[] }>(
    { queryKey: ['streams', 'live'] },
    (old) => {
      if (!old) return old;
      const live = Array.isArray(old.live) ? old.live : [];
      return { ...old, live: stripId(live, streamId) };
    },
  );

  liveEndStreamDebug.removedFromActiveList(streamId);
}
