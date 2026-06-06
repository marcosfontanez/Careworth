import type { WebMediaItem } from "@/lib/web-app/profile-data";
import type { WebPulseUpdateDetail } from "@/lib/web-app/pulse-update-types";
import {
  isWebPulsePicsUpdate,
  resolveWebPicsUrls,
} from "@/lib/web-app/pulse-update-utils";

export type WebPulsePhotoViewerItem = {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  sourceLabel: string;
  sourcePostId?: string;
  pulseUpdateId?: string;
  commentCount?: number;
  likeTarget?: "post" | "pulse-update";
  likeTargetId?: string;
  liked?: boolean;
  likeCount?: number;
  showViewPost: boolean;
  showComment: boolean;
  isAnonymous?: boolean;
};

export type WebPulsePhotoViewerCreator = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
};

function itemFromMediaHub(item: WebMediaItem): WebPulsePhotoViewerItem | null {
  if (item.isVideo) return null;
  const imageUrl = (item.imageUrl ?? item.thumbnailUrl)?.trim();
  if (!imageUrl) return null;

  if (item.postId) {
    return {
      id: item.key,
      imageUrl,
      thumbnailUrl: item.thumbnailUrl,
      caption: item.caption,
      sourceLabel: item.sourceLabel ?? "Feed post",
      sourcePostId: item.postId,
      commentCount: item.commentCount,
      likeTarget: "post",
      likeTargetId: item.postId,
      liked: item.likedByViewer,
      likeCount: item.likeCount,
      showViewPost: true,
      showComment: true,
      isAnonymous: item.isAnonymous,
    };
  }

  if (item.pulseUpdateId) {
    return {
      id: item.key,
      imageUrl,
      thumbnailUrl: item.thumbnailUrl,
      caption: item.caption,
      sourceLabel: item.sourceLabel ?? "My Pulse",
      pulseUpdateId: item.pulseUpdateId,
      commentCount: item.commentCount,
      likeTarget: "pulse-update",
      likeTargetId: item.pulseUpdateId,
      liked: item.likedByViewer,
      likeCount: item.likeCount,
      showViewPost: true,
      showComment: true,
    };
  }

  return null;
}

export function buildWebMediaHubPhotoGallery(items: WebMediaItem[]): WebPulsePhotoViewerItem[] {
  const out: WebPulsePhotoViewerItem[] = [];
  for (const item of items) {
    const mapped = itemFromMediaHub(item);
    if (mapped) out.push(mapped);
  }
  return out;
}

/** Gallery for one My Pulse pics update on the profile rail. */
export function buildWebPulseUpdatePhotoGallery(update: {
  id: string;
  content?: string | null;
  previewText?: string | null;
  type: string;
  linkedUrl?: string | null;
  picsUrls?: string[];
  mediaThumb?: string | null;
  commentCount?: number;
  likeCount?: number;
  likedByViewer?: boolean;
}): WebPulsePhotoViewerItem[] {
  if (!isWebPulsePicsUpdate(update)) return [];
  const urls = resolveWebPicsUrls(update);
  const caption = update.content?.trim() || update.previewText?.trim() || null;
  return urls.map((url, index) => ({
    id: `pulse:${update.id}:${index}`,
    imageUrl: url,
    thumbnailUrl: url,
    caption,
    sourceLabel: "My Pulse",
    pulseUpdateId: update.id,
    commentCount: update.commentCount,
    likeTarget: "pulse-update" as const,
    likeTargetId: update.id,
    liked: update.likedByViewer,
    likeCount: update.likeCount ?? 0,
    showViewPost: true,
    showComment: true,
  }));
}

/** Gallery from a loaded pulse update detail page. */
export function buildWebPulseUpdateDetailGallery(
  update: WebPulseUpdateDetail,
): WebPulsePhotoViewerItem[] {
  return buildWebPulseUpdatePhotoGallery(update);
}

export function findWebGalleryIndexByKey(items: WebPulsePhotoViewerItem[], key: string): number {
  const idx = items.findIndex((i) => i.id === key);
  return idx >= 0 ? idx : 0;
}
