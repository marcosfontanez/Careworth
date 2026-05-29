import type { Router } from 'expo-router';
import { feedClipCreatorAttribution } from '@/lib/feedClipPublish';
import { getFeedLiveSourceLabel } from '@/lib/feedClipLabels';
import { liveStreamHref } from '@/lib/navigation/liveRoutes';
import type { CreatorSummary, Post } from '@/types';

export const FEED_CLIP_ORIGINAL_UNAVAILABLE_LABEL = 'Original unavailable';
export const FEED_CLIP_LIVE_UNAVAILABLE_LABEL = 'Live unavailable';

export type FeedClipAttributionNavTarget =
  | { kind: 'source_post'; postId: string }
  | { kind: 'source_creator'; userId: string }
  | { kind: 'live_stream'; streamId: string };

export type ResolvedFeedClipAttribution = {
  /** Primary creator/source chip (feed clip from another post). */
  creatorChip: {
    label: string;
    navigable: boolean;
    target: FeedClipAttributionNavTarget | null;
    sourceUnavailable: boolean;
  } | null;
  /** Secondary live lineage chip when clipped from a live replay. */
  liveChip: {
    label: string;
    navigable: boolean;
    target: FeedClipAttributionNavTarget | null;
    liveUnavailable: boolean;
  } | null;
};

type CreatorLike = Pick<CreatorSummary, 'displayName' | 'username'> | null | undefined;

export function isFeedClipPost(
  post: Pick<Post, 'sourcePostId' | 'sourceLiveStreamId' | 'sourceCreatorId'>,
): boolean {
  return Boolean(
    post.sourcePostId?.trim() || post.sourceLiveStreamId?.trim() || post.sourceCreatorId?.trim(),
  );
}

/** First-line caption attribution from publish (`Clipped from @handle`). */
export function parseFeedClipAttributionFromCaption(caption?: string | null): string | null {
  const first = caption?.split('\n')[0]?.trim();
  if (!first?.startsWith('Clipped from')) return null;
  return first;
}

/** Compact grid badge without fetching the source post. */
export function getFeedClipCompactBadgeLabel(
  post: Pick<Post, 'sourcePostId' | 'sourceLiveStreamId' | 'caption'>,
): string | null {
  if (post.sourceLiveStreamId?.trim()) return 'Live clip';
  if (post.sourcePostId?.trim()) {
    return parseFeedClipAttributionFromCaption(post.caption) ?? 'Clip';
  }
  const parsed = parseFeedClipAttributionFromCaption(post.caption);
  return parsed ?? null;
}

function creatorLabelFromProfile(creator: CreatorLike): string {
  if (creator) return feedClipCreatorAttribution(creator);
  return 'Clipped from creator';
}

/** Pure resolver — pass fetched source post / creator profile from hooks. */
export function resolveFeedClipAttribution(
  post: Pick<
    Post,
    'sourcePostId' | 'sourceLiveStreamId' | 'sourceCreatorId' | 'caption'
  >,
  opts?: {
    sourcePost?: Post | null;
    sourcePostLoading?: boolean;
    sourceCreatorProfile?: CreatorLike;
    sourceCreatorLoading?: boolean;
    liveStreamAvailable?: boolean;
  },
): ResolvedFeedClipAttribution {
  const sourcePostId = post.sourcePostId?.trim() ?? '';
  const sourceCreatorId = post.sourceCreatorId?.trim() ?? '';
  const sourceLiveStreamId = post.sourceLiveStreamId?.trim() ?? '';

  let creatorChip: ResolvedFeedClipAttribution['creatorChip'] = null;

  if (sourcePostId || sourceCreatorId || parseFeedClipAttributionFromCaption(post.caption)) {
    if (opts?.sourcePostLoading) {
      creatorChip = null;
    } else if (opts?.sourcePost) {
      creatorChip = {
        label: creatorLabelFromProfile(opts.sourcePost.creator),
        navigable: true,
        target: { kind: 'source_post', postId: opts.sourcePost.id },
        sourceUnavailable: false,
      };
    } else if (sourcePostId && !opts?.sourcePost) {
      const captionLabel = parseFeedClipAttributionFromCaption(post.caption);
      if (opts?.sourceCreatorLoading) {
        creatorChip = captionLabel
          ? {
              label: captionLabel,
              navigable: false,
              target: null,
              sourceUnavailable: true,
            }
          : null;
      } else if (opts?.sourceCreatorProfile || sourceCreatorId) {
        const label = opts?.sourceCreatorProfile
          ? creatorLabelFromProfile(opts.sourceCreatorProfile)
          : captionLabel ?? FEED_CLIP_ORIGINAL_UNAVAILABLE_LABEL;
        const navigable = Boolean(sourceCreatorId && opts?.sourceCreatorProfile);
        creatorChip = {
          label,
          navigable,
          target: navigable ? { kind: 'source_creator', userId: sourceCreatorId } : null,
          sourceUnavailable: true,
        };
      } else {
        creatorChip = {
          label: captionLabel ?? FEED_CLIP_ORIGINAL_UNAVAILABLE_LABEL,
          navigable: false,
          target: null,
          sourceUnavailable: true,
        };
      }
    } else if (sourceCreatorId) {
      if (opts?.sourceCreatorLoading) {
        creatorChip = null;
      } else if (opts?.sourceCreatorProfile) {
        creatorChip = {
          label: creatorLabelFromProfile(opts.sourceCreatorProfile),
          navigable: true,
          target: { kind: 'source_creator', userId: sourceCreatorId },
          sourceUnavailable: true,
        };
      } else {
        creatorChip = {
          label: parseFeedClipAttributionFromCaption(post.caption) ?? FEED_CLIP_ORIGINAL_UNAVAILABLE_LABEL,
          navigable: false,
          target: null,
          sourceUnavailable: true,
        };
      }
    } else {
      const captionLabel = parseFeedClipAttributionFromCaption(post.caption);
      if (captionLabel) {
        creatorChip = {
          label: captionLabel,
          navigable: false,
          target: null,
          sourceUnavailable: true,
        };
      }
    }
  }

  let liveChip: ResolvedFeedClipAttribution['liveChip'] = null;
  if (sourceLiveStreamId) {
    const liveLabel = getFeedLiveSourceLabel(post);
    const liveUnavailable = opts?.liveStreamAvailable === false;
    liveChip = {
      label: liveUnavailable ? FEED_CLIP_LIVE_UNAVAILABLE_LABEL : liveLabel ?? 'Clipped from Live',
      navigable: !liveUnavailable,
      target: liveUnavailable ? null : { kind: 'live_stream', streamId: sourceLiveStreamId },
      liveUnavailable,
    };
  }

  return { creatorChip, liveChip };
}

export function pushFeedClipAttributionTarget(
  router: Pick<Router, 'push'>,
  target: FeedClipAttributionNavTarget,
): void {
  switch (target.kind) {
    case 'source_post':
      router.push(`/post/${encodeURIComponent(target.postId)}` as never);
      break;
    case 'source_creator':
      router.push(`/profile/${encodeURIComponent(target.userId)}` as never);
      break;
    case 'live_stream':
      router.push(liveStreamHref(target.streamId));
      break;
    default:
      break;
  }
}
