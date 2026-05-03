import type { QueryClient } from '@tanstack/react-query';
import type { Community } from '@/types';

/** Matches `useCommunity` in `hooks/useQueries.ts` — seed before `router.push` when the row is already in hand. */
export function primeCommunityDetailCache(queryClient: QueryClient, community: Community) {
  const key = (community.slug ?? '').trim();
  if (!key || !community.id) return;
  queryClient.setQueryData(['community', key], community);
}
