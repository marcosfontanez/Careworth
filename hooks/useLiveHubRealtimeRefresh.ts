import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { filterActiveLiveStreams } from '@/lib/live/activeLiveStreams';
import type { LiveHubHomePayload } from '@/types/liveHub';

function safeHubPayload(old: LiveHubHomePayload): LiveHubHomePayload {
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

/**
 * Invalidate Live hub caches when live_streams rows change, and prune ended rows from cache immediately.
 */
export function useLiveHubRealtimeRefresh(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('live_hub:live_streams')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_streams' },
        (payload) => {
          try {
            const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
            const streamId = row?.id != null ? String(row.id) : null;
            const ended =
              row?.ended_at != null ||
              row?.status === 'ended' ||
              payload.eventType === 'DELETE';

            if (streamId && ended) {
              queryClient.setQueriesData<LiveHubHomePayload>({ queryKey: ['liveHub'] }, (old) => {
                if (!old) return old;
                const safe = safeHubPayload(old);
                const drop = <T extends { id: string }>(list: T[]) =>
                  list.filter((s) => s.id !== streamId);
                return {
                  ...safe,
                  happeningNow: drop(safe.happeningNow),
                  featured: drop(safe.featured),
                  trending: drop(safe.trending),
                  shopLiveDeals: drop(safe.shopLiveDeals),
                  circleLives: drop(safe.circleLives),
                  allFiltered: drop(safe.allFiltered),
                };
              });
            }

            queryClient.setQueriesData<LiveHubHomePayload>({ queryKey: ['liveHub'] }, (old) => {
              if (!old) return old;
              const safe = safeHubPayload(old);
              return {
                ...safe,
                happeningNow: filterActiveLiveStreams(safe.happeningNow),
                featured: filterActiveLiveStreams(safe.featured),
                trending: filterActiveLiveStreams(safe.trending),
                shopLiveDeals: filterActiveLiveStreams(safe.shopLiveDeals),
                circleLives: filterActiveLiveStreams(safe.circleLives),
                allFiltered: filterActiveLiveStreams(safe.allFiltered),
              };
            });

            void queryClient.invalidateQueries({ queryKey: ['liveHub'] });
          } catch (err) {
            if (__DEV__) console.warn('[useLiveHubRealtimeRefresh]', err);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}
