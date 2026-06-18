import type { QueryClient } from '@tanstack/react-query';
import type { Post, ProfileUpdate } from '@/types';
import { likedPostKeys, profileUpdateKeys } from '@/lib/queryKeys';

/** Keep Media Hub + profile post lists aligned after a photo like in the lightbox. */
export function syncPostLikeInCaches(
  queryClient: QueryClient,
  args: {
    viewerId: string;
    profileUserId: string;
    postId: string;
    liked: boolean;
  },
): void {
  const { viewerId, profileUserId, postId, liked } = args;
  const delta = liked ? 1 : -1;

  queryClient.setQueriesData<Post[]>(
    { queryKey: ['userPosts', profileUserId] },
    (old) => {
      if (!old) return old;
      return old.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: liked,
              likeCount: Math.max(0, (p.likeCount ?? 0) + delta),
            }
          : p,
      );
    },
  );

  queryClient.setQueryData<string[]>(likedPostKeys.forUser(viewerId), (old) => {
    const set = new Set(old ?? []);
    if (liked) set.add(postId);
    else set.delete(postId);
    return [...set];
  });
}

function patchProfileUpdateLike(
  update: ProfileUpdate,
  updateId: string,
  liked: boolean,
): ProfileUpdate {
  if (update.id !== updateId) return update;
  const delta = liked ? 1 : -1;
  return {
    ...update,
    liked,
    likeCount: Math.max(0, (update.likeCount ?? 0) + delta),
  };
}

export function syncProfileUpdateLikeInCaches(
  queryClient: QueryClient,
  args: {
    ownerUserId: string;
    updateId: string;
    liked: boolean;
    viewerId?: string | null;
  },
): void {
  const { ownerUserId, updateId, liked, viewerId } = args;

  queryClient.setQueriesData<ProfileUpdate[]>(
    { queryKey: profileUpdateKeys.forUser(ownerUserId) },
    (old) => {
      if (!old) return old;
      return old.map((u) => patchProfileUpdateLike(u, updateId, liked));
    },
  );

  queryClient.setQueriesData<ProfileUpdate[]>(
    { queryKey: ['profileUpdates', 'mediaHubPics', ownerUserId] },
    (old) => {
      if (!old) return old;
      return old.map((u) => patchProfileUpdateLike(u, updateId, liked));
    },
  );

  queryClient.setQueriesData<ProfileUpdate | null>(
    { queryKey: profileUpdateKeys.byId(updateId) },
    (old) => (old ? patchProfileUpdateLike(old, updateId, liked) : old),
  );

  if (viewerId) {
    queryClient.setQueryData<ProfileUpdate | null>(
      profileUpdateKeys.detailForViewer(updateId, viewerId),
      (old) => (old ? patchProfileUpdateLike(old, updateId, liked) : old),
    );
  }
}
