import { canProcessFeedClipStorage, FEED_CLIP_STORAGE_UNAVAILABLE_MESSAGE } from '@/lib/feedClipStorage';
import {
  canDownloadPostWithCreatorSettings,
  isPostOwner,
  postAllowsViewerClips,
} from '@/lib/postCreatorPermissions';
import { isRemixEligibleVideoPost } from '@/lib/videoRemixEligibility';
import type { Post } from '@/types';

export type FeedClipDenyReason =
  | 'feature_disabled'
  | 'anonymous'
  | 'not_video'
  | 'no_media'
  | 'processing'
  | 'storage_unavailable'
  | 'not_allowed'
  | 'creator_disabled';

export type FeedClipPermissionResult =
  | { allowed: true }
  | { allowed: false; reason: FeedClipDenyReason; message: string };

type Viewer = { id?: string | null } | null | undefined;

function isProcessing(post: Pick<Post, 'mediaProcessingStatus'>): boolean {
  const proc = (post.mediaProcessingStatus ?? '').trim().toLowerCase();
  return proc === 'queued' || proc === 'running';
}

const DENY_MESSAGES: Record<FeedClipDenyReason, string> = {
  feature_disabled: 'Feed clipping is not available right now.',
  anonymous: 'Anonymous posts cannot be clipped.',
  not_video: 'Only video posts can be clipped.',
  no_media: 'This post has no clip-able media.',
  processing: 'Wait until this video finishes processing.',
  storage_unavailable: FEED_CLIP_STORAGE_UNAVAILABLE_MESSAGE,
  not_allowed: 'Clipping is not allowed on this post.',
  creator_disabled: 'The creator turned off clipping for this video.',
};

/** Whether the viewer may open the Feed clip composer for this post. */
export function canClipFeedPost(
  post: Pick<
    Post,
    | 'id'
    | 'type'
    | 'isAnonymous'
    | 'mediaUrl'
    | 'thumbnailUrl'
    | 'mediaProcessingStatus'
    | 'creatorId'
    | 'privacyMode'
    | 'allowViewerClips'
  >,
  viewer: Viewer,
  opts?: { feedClippingEnabled?: boolean; viewerFollowsCreator?: boolean },
): FeedClipPermissionResult {
  if (opts?.feedClippingEnabled === false) {
    return { allowed: false, reason: 'feature_disabled', message: DENY_MESSAGES.feature_disabled };
  }
  if (post.isAnonymous) {
    return { allowed: false, reason: 'anonymous', message: DENY_MESSAGES.anonymous };
  }
  if (post.type !== 'video') {
    return { allowed: false, reason: 'not_video', message: DENY_MESSAGES.not_video };
  }
  if (!post.mediaUrl?.trim() && !post.thumbnailUrl?.trim()) {
    return { allowed: false, reason: 'no_media', message: DENY_MESSAGES.no_media };
  }
  if (isProcessing(post)) {
    return { allowed: false, reason: 'processing', message: DENY_MESSAGES.processing };
  }
  if (!canProcessFeedClipStorage(post)) {
    return {
      allowed: false,
      reason: 'storage_unavailable',
      message: DENY_MESSAGES.storage_unavailable,
    };
  }

  if (isPostOwner(post, viewer)) return { allowed: true };

  if (!postAllowsViewerClips(post)) {
    return { allowed: false, reason: 'creator_disabled', message: DENY_MESSAGES.creator_disabled };
  }

  if (!isRemixEligibleVideoPost(post)) {
    return { allowed: false, reason: 'not_allowed', message: DENY_MESSAGES.not_allowed };
  }

  if (post.privacyMode === 'followers' && !opts?.viewerFollowsCreator) {
    return { allowed: false, reason: 'not_allowed', message: DENY_MESSAGES.not_allowed };
  }

  if (post.privacyMode !== 'public' && post.privacyMode !== 'followers') {
    return { allowed: false, reason: 'not_allowed', message: DENY_MESSAGES.not_allowed };
  }

  return { allowed: true };
}

/** Download in clip composer / long-press — respects creator download toggle. */
export function canDownloadFeedPost(
  post: Pick<
    Post,
    | 'type'
    | 'isAnonymous'
    | 'mediaUrl'
    | 'thumbnailUrl'
    | 'creatorId'
    | 'mediaProcessingStatus'
    | 'allowClipDownloads'
  >,
  viewer: Viewer,
): boolean {
  return canDownloadPostWithCreatorSettings(post, viewer);
}

export function feedClipDenyMessage(reason: FeedClipDenyReason): string {
  return DENY_MESSAGES[reason];
}
