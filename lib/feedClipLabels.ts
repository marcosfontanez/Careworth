import { feedClipCreatorAttribution } from '@/lib/feedClipPublish';
import type { CreatorSummary, Post } from '@/types';

/** `@handle` attribution line for feed clip chips. */
export function feedClipCreatorAttributionLabel(
  source: Pick<CreatorSummary, 'displayName' | 'username'>,
): string {
  return feedClipCreatorAttribution(source);
}

/** Subtle feed label for posts clipped from a live stream (migration 207). */
export function getFeedLiveSourceLabel(
  post: Pick<Post, 'sourceLiveStreamId'>,
): 'Clipped from Live' | null {
  return post.sourceLiveStreamId?.trim() ? 'Clipped from Live' : null;
}

/** Label when post was clipped from another feed video (migration 210). */
export function getFeedClipCreatorLabel(
  post: Pick<Post, 'sourcePostId'>,
  sourceCreator?: Pick<CreatorSummary, 'displayName' | 'username'> | null,
): string | null {
  if (!post.sourcePostId?.trim()) return null;
  if (sourceCreator) return feedClipCreatorAttributionLabel(sourceCreator);
  return 'Clipped from creator';
}

export type FeedClipAttribution = {
  liveLabel: 'Clipped from Live' | null;
  creatorLabel: string | null;
};

/** Combined attribution for feed overlay chips. */
export function getFeedClipAttribution(
  post: Pick<Post, 'sourcePostId' | 'sourceLiveStreamId'>,
  sourceCreator?: Pick<CreatorSummary, 'displayName' | 'username'> | null,
): FeedClipAttribution {
  return {
    liveLabel: getFeedLiveSourceLabel(post),
    creatorLabel: getFeedClipCreatorLabel(post, sourceCreator),
  };
}
