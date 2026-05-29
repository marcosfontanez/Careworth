import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';
import { useLikedPostIds } from '@/hooks/useQueries';
import { sharePostMenu } from '@/lib/share';
import { bumpPostCount } from '@/lib/postCacheUpdates';
import { enqueueAction } from '@/lib/offlineQueue';
import { feedKeys, likedPostKeys, savedPostKeys, userKeys } from '@/lib/queryKeys';
import { blockUser } from '@/services/supabase/blocks';
import { feedSignalsService, postsService, profilesService } from '@/services/supabase';
import type { Post } from '@/types';

type ShareOpts = {
  circleSlug?: string;
  allowPulseShare?: boolean;
};

type UseFeedEngagementOptions = {
  /** Default circle slug passed through to share / My Pulse pin flows. */
  defaultCircleSlug?: string;
};

export function useFeedEngagement(options: UseFeedEngagementOptions = {}) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const savedPostIds = useAppStore((s) => s.savedPostIds);
  const followedCreatorIds = useAppStore((s) => s.followedCreatorIds);
  const toggleSavePost = useAppStore((s) => s.toggleSavePost);
  const setCreatorFollowed = useAppStore((s) => s.setCreatorFollowed);

  const { data: likedIdsArr = [] } = useLikedPostIds(user?.id);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [rowUiEpoch, setRowUiEpoch] = useState(0);
  const bumpRowUi = useCallback(() => setRowUiEpoch((e) => e + 1), []);

  const likedServerSig = likedIdsArr.join('|');
  useEffect(() => {
    setLikedPosts(new Set(likedIdsArr));
    bumpRowUi();
  }, [likedServerSig, bumpRowUi]);

  const likedPostsRef = useRef(likedPosts);
  const savedPostIdsRef = useRef(savedPostIds);
  const followedCreatorIdsRef = useRef(followedCreatorIds);
  likedPostsRef.current = likedPosts;
  savedPostIdsRef.current = savedPostIds;
  followedCreatorIdsRef.current = followedCreatorIds;

  const invalidateFeedQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: feedKeys.root() });
    queryClient.invalidateQueries({ queryKey: feedKeys.infiniteRoot() });
  }, [queryClient]);

  const toggleLike = useCallback(
    async (id: string) => {
      let willBeLiked = false;
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          willBeLiked = false;
        } else {
          next.add(id);
          willBeLiked = true;
        }
        return next;
      });
      bumpRowUi();
      bumpPostCount(id, 'likeCount', willBeLiked ? 1 : -1);
      if (!user) return;
      try {
        await postsService.toggleLike(user.id, id);
        queryClient.invalidateQueries({ queryKey: likedPostKeys.forUser(user.id) });
      } catch {
        enqueueAction({
          type: willBeLiked ? 'like_post' : 'unlike_post',
          payload: { postId: id, userId: user.id },
        }).catch(() => {});
      }
    },
    [user, bumpRowUi, queryClient],
  );

  const handleToggleSave = useCallback(
    async (id: string) => {
      const wasSaved = savedPostIdsRef.current.has(id);
      toggleSavePost(id);
      bumpRowUi();
      bumpPostCount(id, 'saveCount', wasSaved ? -1 : 1);
      if (!user) return;
      try {
        await postsService.toggleSave(user.id, id);
        queryClient.invalidateQueries({
          queryKey: savedPostKeys.forUser(user.id),
          refetchType: 'all',
        });
      } catch (e: unknown) {
        enqueueAction({
          type: wasSaved ? 'unsave_post' : 'save_post',
          payload: { postId: id, userId: user.id },
        }).catch(() => {});
        const msg =
          e && typeof e === 'object' && 'message' in e
            ? String((e as Error).message)
            : 'Save failed';
        toast.show(msg.length > 100 ? `${msg.slice(0, 97)}…` : msg, 'error');
      }
    },
    [user, toggleSavePost, toast, bumpRowUi, queryClient],
  );

  const handleToggleFollow = useCallback(
    async (creatorId: string) => {
      if (!creatorId || creatorId === user?.id) return;
      const wasFollowing = followedCreatorIdsRef.current.has(creatorId);
      setCreatorFollowed(creatorId, !wasFollowing);
      bumpRowUi();
      if (!user) return;
      try {
        await profilesService.toggleFollow(user.id, creatorId);
        queryClient.invalidateQueries({ queryKey: userKeys.detail(creatorId) });
      } catch (e: unknown) {
        enqueueAction({
          type: wasFollowing ? 'unfollow_user' : 'follow_user',
          payload: { followerId: user.id, followingId: creatorId },
        }).catch(() => {});
        const msg =
          e && typeof e === 'object' && 'message' in e
            ? String((e as Error).message)
            : 'Follow failed';
        toast.show(msg.length > 100 ? `${msg.slice(0, 97)}…` : msg, 'error');
      }
    },
    [user, setCreatorFollowed, toast, bumpRowUi, queryClient],
  );

  const handleShare = useCallback(
    (post: Post, shareOpts?: ShareOpts) => {
      void sharePostMenu(post, {
        toast: toast.show,
        queryClient,
        circleSlug: shareOpts?.circleSlug ?? options.defaultCircleSlug,
        allowPulseShare: shareOpts?.allowPulseShare,
      });
    },
    [toast, queryClient, options.defaultCircleSlug],
  );

  const handleNotInterested = useCallback(
    async (postId: string) => {
      if (!user?.id || !postId) return;
      try {
        await feedSignalsService.recordAction(user.id, 'not_interested', { postId });
        invalidateFeedQueries();
        toast.show('We will show fewer posts like this', 'success');
      } catch {
        toast.show('Could not update feed', 'error');
      }
    },
    [user?.id, invalidateFeedQueries, toast],
  );

  const handleHideCreatorFromFeed = useCallback(
    async (creatorId: string) => {
      if (!user?.id || !creatorId) return;
      try {
        await feedSignalsService.recordAction(user.id, 'hide_creator', { creatorId });
        invalidateFeedQueries();
        toast.show('Hidden this creator from your Feed', 'success');
      } catch {
        toast.show('Could not update feed', 'error');
      }
    },
    [user?.id, invalidateFeedQueries, toast],
  );

  const handleBlockCreator = useCallback(
    async (creatorId: string, displayName?: string) => {
      if (!user?.id || !creatorId || creatorId === user.id) return;
      try {
        await blockUser(user.id, creatorId);
        invalidateFeedQueries();
        toast.show(`${displayName?.trim() || 'Creator'} blocked`, 'success');
      } catch {
        toast.show('Could not block user', 'error');
      }
    },
    [user?.id, invalidateFeedQueries, toast],
  );

  const isPostLiked = useCallback((postId: string) => likedPosts.has(postId), [likedPosts]);

  return {
    likedPosts,
    likedPostsRef,
    savedPostIds,
    savedPostIdsRef,
    followedCreatorIds,
    followedCreatorIdsRef,
    rowUiEpoch,
    bumpRowUi,
    toggleLike,
    handleToggleSave,
    handleToggleFollow,
    handleShare,
    handleNotInterested,
    handleHideCreatorFromFeed,
    handleBlockCreator,
    isPostLiked,
  };
}
