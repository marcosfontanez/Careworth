import type { QueryClient } from '@tanstack/react-query';
import type { Community } from '@/types';
import { circleContentKeys } from '@/lib/queryKeys';
import { postsService, communitiesService } from '@/services/supabase';
import { circleContentService } from '@/services/circleContent';

/** Matches `useCommunity` in `hooks/useQueries.ts` — seed before `router.push` when the row is already in hand. */
export function primeCommunityDetailCache(queryClient: QueryClient, community: Community) {
  const key = (community.slug ?? '').trim();
  if (!key || !community.id) return;
  queryClient.setQueryData(['community', key], community);
}

/**
 * Warm circle wall + Questions threads before navigation settles so the room
 * rarely paints an empty “Loading…” shell when the row already had `id` + `slug`.
 */
export function prefetchCircleRoom(
  queryClient: QueryClient,
  community: Community,
  viewerId: string | null,
) {
  primeCommunityDetailCache(queryClient, community);
  const id = community.id;
  const slug = (community.slug ?? '').trim();
  if (!id || !slug) return;

  void queryClient.prefetchQuery({
    queryKey: circleContentKeys.communityPosts(id, viewerId),
    queryFn: () => postsService.getByCommunity(id, viewerId),
    staleTime: 45_000,
  });
  void queryClient.prefetchQuery({
    queryKey: circleContentKeys.threadsForRoom(slug, id),
    queryFn: () => circleContentService.getThreadsByCommunityId(id),
    staleTime: 45_000,
  });
}

/**
 * Cold paths (deep link, My Pulse): one getBySlug then same warm pattern as tap prefetch.
 */
export function prefetchCircleRoomBySlug(
  queryClient: QueryClient,
  rawSlug: string,
  viewerId: string | null,
) {
  const slug = (rawSlug ?? '').trim();
  if (!slug) return;
  void (async () => {
    const row = await communitiesService.getBySlug(slug);
    if (row) prefetchCircleRoom(queryClient, row, viewerId);
  })();
}
