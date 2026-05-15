import { useQuery } from '@tanstack/react-query';

import { streamsService } from '@/services/streams';

export function useLiveStreams() {
  return useQuery({
    queryKey: ['streams', 'live'],
    queryFn: () => streamsService.getAllStreams(),
    /**
     * Live stream presence doesn't need second-by-second freshness — a
     * 90s cadence is "live enough" for a discover-tab card and cuts
     * background traffic from idle viewers ~3× vs the old 30s polling
     * (was hammering the streams table every 30s on every focused
     * Discover tab session).
     */
    refetchInterval: 90_000,
    refetchIntervalInBackground: false,
    /** Align with poll cadence so remounts don’t immediately refetch the same payload. */
    staleTime: 90_000,
    gcTime: 1000 * 60 * 30,
  });
}

export function useStream(id: string) {
  return useQuery({
    queryKey: ['stream', id],
    queryFn: () => streamsService.getStreamById(id),
    enabled: !!id,
    staleTime: 30_000,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
  });
}
