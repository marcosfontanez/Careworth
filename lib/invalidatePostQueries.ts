import type { QueryClient } from '@tanstack/react-query';
import { feedKeys, postKeys, profileUpdateKeys } from './queryKeys';

/**
 * Call after creating/updating/deleting posts so feed, circles, and
 * profile caches stay in sync.
 *
 * Uses only partial-matching root keys so every viewer-scoped cache
 * entry gets refreshed without us having to enumerate viewer ids.
 */
export async function invalidatePostRelatedQueries(queryClient: QueryClient, opts?: { creatorId?: string }) {
  await queryClient.invalidateQueries({ queryKey: feedKeys.root() });
  await queryClient.refetchQueries({ queryKey: feedKeys.root() });
  queryClient.invalidateQueries({ queryKey: feedKeys.infiniteRoot() });
  queryClient.invalidateQueries({ queryKey: profileUpdateKeys.root() });
  queryClient.invalidateQueries({ queryKey: ['myPulseEligiblePosts'] });
  queryClient.invalidateQueries({ queryKey: ['myPulseEligibleDiscussions'] });
  queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
  queryClient.invalidateQueries({ queryKey: postKeys.root() });
  if (opts?.creatorId) {
    const key = ['userPosts', opts.creatorId] as const;
    queryClient.invalidateQueries({ queryKey: key });
    await queryClient.refetchQueries({ queryKey: key, type: 'active' });
  } else {
    queryClient.invalidateQueries({ queryKey: ['userPosts'] });
    await queryClient.refetchQueries({ queryKey: ['userPosts'], type: 'active' });
  }
}
