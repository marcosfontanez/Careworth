import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { fetchLiveHubHome } from '@/services/live/liveHubService';
import type { LiveHubCategoryTab } from '@/types/liveHub';

export function liveHubQueryKey(tab: LiveHubCategoryTab, viewerId: string | null) {
  return ['liveHub', 'home', tab, viewerId] as const;
}

export function useLiveHubHome(tab: LiveHubCategoryTab) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;

  return useQuery({
    queryKey: liveHubQueryKey(tab, viewerId),
    queryFn: () => fetchLiveHubHome(tab, viewerId),
    staleTime: 5_000,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    gcTime: 1000 * 60 * 15,
  });
}
