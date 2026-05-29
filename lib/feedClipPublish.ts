import type { CreatorSummary, Post } from '@/types';

export type FeedClipPublishInput = {
  sourcePost: Post;
  trimStartSec: number;
  trimEndSec: number;
  caption: string;
  hashtags: string[];
  communityId?: string | null;
  phiAcknowledged: boolean;
};

export type FeedClipPublishPayload = {
  caption: string;
  hashtags: string[];
  communities?: string[];
  source_post_id: string;
  source_creator_id: string;
  source_live_stream_id?: string;
  clip_start_seconds: number;
  clip_end_seconds: number;
  feed_type_eligible: string[];
  privacy_mode: 'public' | 'followers';
  media_processing_status: 'queued';
};

/** `@handle` attribution line prepended to clip captions. */
export function feedClipCreatorAttribution(source: Pick<CreatorSummary, 'displayName' | 'username'>): string {
  const un = source.username?.trim().replace(/^@+/, '');
  if (un) return `Clipped from @${un}`;
  const name = source.displayName?.trim();
  return name ? `Clipped from ${name}` : 'Clipped from creator';
}

/** Build DB insert payload for a feed clip post (before media job completes). */
export function buildFeedClipPublishPayload(input: FeedClipPublishInput): FeedClipPublishPayload {
  const attribution = feedClipCreatorAttribution(input.sourcePost.creator);
  const body = input.caption.trim();
  const caption = body ? `${attribution}\n\n${body}` : attribution;

  const communities = input.communityId?.trim() ? [input.communityId.trim()] : undefined;

  return {
    caption,
    hashtags: input.hashtags,
    communities,
    source_post_id: input.sourcePost.id,
    source_creator_id: input.sourcePost.creatorId,
    ...(input.sourcePost.sourceLiveStreamId?.trim()
      ? { source_live_stream_id: input.sourcePost.sourceLiveStreamId.trim() }
      : {}),
    clip_start_seconds: input.trimStartSec,
    clip_end_seconds: input.trimEndSec,
    feed_type_eligible: ['forYou', 'following'],
    privacy_mode: 'public',
    media_processing_status: 'queued',
  };
}
