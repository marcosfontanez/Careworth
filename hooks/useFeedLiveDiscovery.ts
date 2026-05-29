import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlags } from '@/lib/featureFlags';
import { filterFeedLiveStreams } from '@/lib/live/feedLiveStreams';
import { useLiveDiscoveryStaleTick } from '@/lib/live/activeLiveStreams';
import { liveHubQueryKey } from '@/hooks/useLiveHubHome';
import { fetchLiveHubHome } from '@/services/live/liveHubService';
import type { LiveHubStream } from '@/types/liveHub';

/**
 * Active live rows for Feed Phase 4 — reuses Live hub payload + the same stale filter
 * as `(tabs)/live` Happening Now.
 */
export function useFeedLiveDiscovery(enabled: boolean) {
  const { user } = useAuth();
  const liveStreaming = useFeatureFlags((s) => s.liveStreaming);
  const liveFeedInjection = useFeatureFlags((s) => s.liveFeedInjection);
  const viewerId = user?.id ?? null;
  const queryEnabled = enabled && liveStreaming && liveFeedInjection;

  const staleTick = useLiveDiscoveryStaleTick();
  const { data, isPending, isFetching } = useQuery({
    queryKey: liveHubQueryKey('for-you', viewerId),
    queryFn: () => fetchLiveHubHome('for-you', viewerId),
    enabled: queryEnabled,
    staleTime: 8_000,
    refetchInterval: queryEnabled ? 15_000 : false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    gcTime: 1000 * 60 * 15,
  });

  const activeLives = useMemo((): LiveHubStream[] => {
    if (!queryEnabled) return [];
    const rows = data?.happeningNow ?? [];
    void staleTick;
    return filterFeedLiveStreams(rows);
  }, [queryEnabled, data?.happeningNow, staleTick]);

  return {
    activeLives,
    isPending: queryEnabled && isPending,
    isFetching: queryEnabled && isFetching,
  };
}
