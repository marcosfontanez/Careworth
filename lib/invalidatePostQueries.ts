import type { QueryClient } from '@tanstack/react-query';
import { feedKeys, postKeys, profileUpdateKeys } from './queryKeys';

/**
 * Call after creating/updating/deleting posts so feed, circles, and
 * profile caches stay in sync.
 *
 * Uses only partial-matching root keys so every viewer-scoped cache
 * entry gets refreshed without us having to enumerate viewer ids.
 *
 * **Perf:** `invalidateQueries` already refetches *active* queries by
 * default. The old pattern called `refetchQueries` immediately after,
 * which duplicated the same network work (two full feed refetches per
 * publish).
 */
export async function invalidatePostRelatedQueries(queryClient: QueryClient, opts?: { creatorId?: string }) {
  const userPostsPartialKey = opts?.creatorId
    ? (['userPosts', opts.creatorId] as const)
    : (['userPosts'] as const);

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: feedKeys.root() }),
    queryClient.invalidateQueries({ queryKey: feedKeys.infiniteRoot() }),
    queryClient.invalidateQueries({ queryKey: profileUpdateKeys.root() }),
    queryClient.invalidateQueries({ queryKey: ['myPulseEligiblePosts'] }),
    queryClient.invalidateQueries({ queryKey: ['myPulseEligibleDiscussions'] }),
    queryClient.invalidateQueries({ queryKey: ['communityPosts'] }),
    queryClient.invalidateQueries({ queryKey: postKeys.root() }),
    queryClient.invalidateQueries({ queryKey: userPostsPartialKey }),
  ]);
}
