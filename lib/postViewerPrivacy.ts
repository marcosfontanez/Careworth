import { anonymousNameOnPost } from '@/lib/anonymousCircle';
import type { CreatorSummary, Post } from '@/types';

/** Placeholder profile id for anonymous posts shown to non-authors (not a real user). */
export const ANONYMOUS_PUBLIC_CREATOR_ID = '00000000-0000-0000-0000-000000000001';

function anonymousCreatorSummary(postId: string, realCreatorId: string): CreatorSummary {
  return {
    id: ANONYMOUS_PUBLIC_CREATOR_ID,
    displayName: anonymousNameOnPost(realCreatorId, postId),
    avatarUrl: '',
    role: 'RN',
    specialty: 'General',
    city: '',
    state: '',
    isVerified: false,
  };
}

/**
 * Strips real author identity for anonymous posts unless the viewer is the author.
 * Idempotent when already redacted. Does not remove posts from lists — use filters for that.
 */
export function redactAnonymousPostForViewer(post: Post, viewerId?: string | null): Post {
  if (!post.isAnonymous) return post;
  if (post.creatorId === ANONYMOUS_PUBLIC_CREATOR_ID) return post;
  if (viewerId && viewerId === post.creatorId) return post;

  const realCreatorId = post.creatorId;
  return {
    ...post,
    creatorId: ANONYMOUS_PUBLIC_CREATOR_ID,
    creator: anonymousCreatorSummary(post.id, realCreatorId),
  };
}

export function finalizePostsForViewer(posts: Post[], viewerId?: string | null): Post[] {
  return posts.map((p) => redactAnonymousPostForViewer(p, viewerId));
}
