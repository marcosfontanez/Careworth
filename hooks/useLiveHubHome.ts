import { useQuery } from '@tanstack/react-query';

import { fetchLiveHubHome } from '@/services/live/liveHubService';
import type { LiveHubCategoryTab } from '@/types/liveHub';

export function liveHubQueryKey(tab: LiveHubCategoryTab) {
  return ['liveHub', 'home', tab] as const;
}

export function useLiveHubHome(tab: LiveHubCategoryTab) {
  return useQuery({
    queryKey: liveHubQueryKey(tab),
    queryFn: () => fetchLiveHubHome(tab),
    staleTime: 60_000,
    gcTime: 1000 * 60 * 15,
  });
}
