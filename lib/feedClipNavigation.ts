import type { Router } from 'expo-router';
import type { Post } from '@/types';

/** Navigate to Feed clip composer for a source post. */
export function pushFeedClipRoute(router: Pick<Router, 'push'>, post: Pick<Post, 'id'>): void {
  router.push(`/create/clip?sourcePostId=${encodeURIComponent(post.id)}`);
}
