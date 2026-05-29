import type { Post } from '@/types';
import { isRemixEligibleVideoPost } from '@/lib/videoRemixEligibility';

type Viewer = { id?: string | null } | null | undefined;

export function isPostOwner(
  post: Pick<Post, 'creatorId'>,
  viewer: Viewer,
): boolean {
  const viewerId = viewer?.id?.trim();
  return Boolean(viewerId && viewerId === post.creatorId);
}

/** Non-owners need explicit allow + public/followers rules handled upstream. */
export function postAllowsViewerClips(
  post: Pick<Post, 'allowViewerClips'>,
): boolean {
  return post.allowViewerClips !== false;
}

export function postAllowsRemix(post: Pick<Post, 'allowRemix'>): boolean {
  return post.allowRemix !== false;
}

export function postAllowsClipDownloads(post: Pick<Post, 'allowClipDownloads'>): boolean {
  return post.allowClipDownloads === true;
}

/** Whether a non-owner may remix (duet/stitch/sound) this post. */
export function canRemixPostWithCreatorSettings(
  post: Pick<
    Post,
    'type' | 'isAnonymous' | 'mediaUrl' | 'thumbnailUrl' | 'allowRemix' | 'creatorId'
  >,
  viewer: Viewer,
): boolean {
  if (isPostOwner(post, viewer)) return isRemixEligibleVideoPost(post);
  if (!postAllowsRemix(post)) return false;
  return isRemixEligibleVideoPost(post);
}

/** Whether a non-owner may download this post's media. */
export function canDownloadPostWithCreatorSettings(
  post: Pick<
    Post,
    | 'type'
    | 'isAnonymous'
    | 'mediaUrl'
    | 'thumbnailUrl'
    | 'allowClipDownloads'
    | 'creatorId'
    | 'mediaProcessingStatus'
  >,
  viewer: Viewer,
): boolean {
  if (isPostOwner(post, viewer)) {
    if (post.type === 'video') return Boolean(post.mediaUrl?.trim());
    if (post.type === 'image') {
      return Boolean(post.mediaUrl?.trim() || post.thumbnailUrl?.trim());
    }
    return false;
  }
  const proc = (post.mediaProcessingStatus ?? '').trim().toLowerCase();
  if (proc === 'queued' || proc === 'running') return false;
  if (!postAllowsClipDownloads(post)) return false;
  return isRemixEligibleVideoPost(post);
}
