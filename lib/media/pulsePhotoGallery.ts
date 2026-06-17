import type { Post, ProfileUpdate } from '@/types';
import { resolvePicsUrls } from '@/utils/myPulseDisplayType';
import type { PulsePhotoViewerItem } from '@/lib/media/pulsePhotoViewerTypes';

type MediaHubPostRef = { kind: 'post'; key: string; post: Post };
type MediaHubPulsePicRef = {
  kind: 'pulse-pic';
  key: string;
  updateId: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
};
export type MediaHubPhotoRef = MediaHubPostRef | MediaHubPulsePicRef;

function postProcessingBlocked(post: Post): boolean {
  const proc = (post.mediaProcessingStatus ?? '').trim().toLowerCase();
  return proc === 'queued' || proc === 'running' || proc === 'failed';
}

function itemFromImagePost(post: Post, key: string): PulsePhotoViewerItem | null {
  if (post.type !== 'image') return null;
  const url = post.mediaUrl?.trim();
  if (!url || postProcessingBlocked(post)) return null;

  const circleSlug = post.linkedCommunitySlug?.trim();
  const isCircle = Boolean(circleSlug);
  const isAnonymous = post.isAnonymous;

  return {
    id: key,
    imageUrl: url,
    thumbnailUrl: post.thumbnailUrl?.trim() || url,
    caption: post.caption?.trim() || undefined,
    sourceType: isCircle ? 'circle' : 'feed',
    sourceLabel: isCircle ? 'Circle post' : 'Feed post',
    sourcePostId: post.id,
    linkedCircleSlug: circleSlug || undefined,
    commentCount: post.commentCount ?? 0,
    likeTarget: { kind: 'post', id: post.id },
    liked: post.isLiked,
    likeCount: post.likeCount ?? 0,
    post,
    showViewPost: true,
    showComment: !post.commentsDisabled,
    isAnonymous,
  };
}

function itemFromPulsePic(
  updateId: string,
  imageUrl: string,
  caption: string,
  index: number,
  linkedPost?: Post,
  update?: ProfileUpdate,
): PulsePhotoViewerItem {
  if (linkedPost && linkedPost.type === 'image' && linkedPost.mediaUrl?.trim()) {
    const fromPost = itemFromImagePost(linkedPost, `pulse-link:${updateId}:${index}`);
    if (fromPost) {
      return {
        ...fromPost,
        id: `pulse:${updateId}:${index}`,
        pulseUpdateId: updateId,
        linkedThreadId: update?.linkedThreadId?.trim() || fromPost.linkedThreadId,
        caption: caption.trim() || fromPost.caption,
        likeTarget: { kind: 'pulse-update', id: updateId },
        liked: update?.liked ?? fromPost.liked,
        likeCount: update?.likeCount ?? fromPost.likeCount ?? 0,
      };
    }
  }

  const circleSlug = update?.linkedCircleSlug?.trim();

  return {
    id: `pulse:${updateId}:${index}`,
    imageUrl,
    thumbnailUrl: imageUrl,
    caption: caption.trim() || undefined,
    sourceType: circleSlug ? 'circle' : 'my-pulse',
    sourceLabel: circleSlug ? 'Circle post' : 'My Pulse',
    pulseUpdateId: updateId,
    linkedCircleSlug: circleSlug || undefined,
    linkedThreadId: update?.linkedThreadId?.trim() || undefined,
    commentCount: update?.commentCount ?? linkedPost?.commentCount,
    likeTarget: { kind: 'pulse-update', id: updateId },
    liked: update?.liked,
    likeCount: update?.likeCount ?? 0,
    showViewPost: true,
    showComment: true,
    isAnonymous: false,
  };
}

/** Build gallery items for Media Hub → Photos tab (and photo-only favorites). */
export function buildMediaHubPhotoGallery(
  items: MediaHubPhotoRef[],
  options?: {
    updatesById?: ReadonlyMap<string, ProfileUpdate>;
    linkedPostsById?: ReadonlyMap<string, Post>;
  },
): PulsePhotoViewerItem[] {
  const out: PulsePhotoViewerItem[] = [];
  for (const item of items) {
    if (item.kind === 'post') {
      const mapped = itemFromImagePost(item.post, item.key);
      if (mapped) out.push(mapped);
    } else {
      const update = options?.updatesById?.get(item.updateId);
      const linkedPostId = update?.linkedPostId?.trim();
      const linkedPost = linkedPostId
        ? options?.linkedPostsById?.get(linkedPostId)
        : undefined;
      const picIndex = Number(item.key.split(':').pop());
      out.push(
        itemFromPulsePic(
          item.updateId,
          item.imageUrl,
          item.caption,
          Number.isFinite(picIndex) ? picIndex : out.length,
          linkedPost,
          update,
        ),
      );
    }
  }
  return out;
}

/** All photos from one My Pulse pics update. */
export function buildPulseUpdatePhotoGallery(
  update: ProfileUpdate,
  linkedPost?: Post,
): PulsePhotoViewerItem[] {
  const urls = resolvePicsUrls(update);
  const caption = update.content?.trim() || update.previewText?.trim() || '';
  return urls.map((url, index) =>
    itemFromPulsePic(update.id, url, caption, index, linkedPost, update),
  );
}

export function findGalleryIndexById(items: PulsePhotoViewerItem[], id: string): number {
  const idx = items.findIndex((i) => i.id === id);
  return idx >= 0 ? idx : 0;
}

export function findGalleryIndexByKey(items: PulsePhotoViewerItem[], key: string): number {
  return findGalleryIndexById(items, key);
}
