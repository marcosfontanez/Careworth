import type { Post, UserProfile } from '@/types';
import { postHasDemoCatalogMedia } from '@/utils/postPreviewMedia';

export type CreatorVideoSort = 'newest' | 'popular';

export function filterCreatorVideos(
  posts: Post[] | undefined,
  isOwner: boolean,
  viewedProfile: UserProfile | null | undefined,
): Post[] {
  const list = posts ?? [];
  if (isOwner) {
    return list.filter(
      (p) =>
        !postHasDemoCatalogMedia(p) &&
        p.type === 'video' &&
        Boolean(p.mediaUrl?.trim() || p.thumbnailUrl?.trim()),
    );
  }
  if (viewedProfile?.privacyMode === 'private') return [];
  return list.filter(
    (p) =>
      !postHasDemoCatalogMedia(p) &&
      p.type === 'video' &&
      Boolean(p.mediaUrl?.trim() || p.thumbnailUrl?.trim()),
  );
}

export function sortCreatorVideos(videos: Post[], sort: CreatorVideoSort): Post[] {
  const v = [...videos];
  if (sort === 'newest') {
    v.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  } else {
    v.sort((a, b) => {
      if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
      return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
    });
  }
  return v;
}

export function creatorVideoStartIndex(videos: Post[], startPostId: string | undefined): number {
  if (!startPostId?.trim()) return 0;
  const idx = videos.findIndex((p) => p.id === startPostId.trim());
  return idx >= 0 ? idx : 0;
}
