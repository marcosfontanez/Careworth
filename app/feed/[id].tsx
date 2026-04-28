import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoFeedPost } from '@/components/feed/VideoFeedPost';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePost, useLikedPostIds } from '@/hooks/useQueries';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { sharePostMenu } from '@/lib/share';
import { postsService, profilesService } from '@/services/supabase';
import { queryClient } from '@/lib/queryClient';
import { bumpPostCount } from '@/lib/postCacheUpdates';
import { enqueueAction } from '@/lib/offlineQueue';
import { likedPostKeys, savedPostKeys, userKeys } from '@/lib/queryKeys';

/**
 * Single-post fullscreen feed viewer. Opened by deep-links (including
 * taps on My Pulse clip / Circle-post cards) so visitors can watch the
 * ORIGINAL video in the exact same TikTok-style shell the main feed
 * uses, with real engagement wiring (like / save / share / follow /
 * comment) backed by the same mutations and optimistic cache patches
 * as `app/(tabs)/feed.tsx`. The legacy in-memory stub lived here
 * before and was silently dropping likes / follows on the floor — the
 * bug visitors hit when they said "it made a whole new post".
 */
export default function FeedPostScreen() {
  const { id, circle } = useLocalSearchParams<{ id: string; circle?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();

  const { data: post, isLoading } = usePost(id);
  const { data: likedIdsArr = [] } = useLikedPostIds(user?.id);

  const savedPostIds = useAppStore((s) => s.savedPostIds);
  const followedCreatorIds = useAppStore((s) => s.followedCreatorIds);
  const toggleSavePost = useAppStore((s) => s.toggleSavePost);
  const setCreatorFollowed = useAppStore((s) => s.setCreatorFollowed);

  /**
   * Hydrate the heart state from the viewer's liked-set so repeat opens
   * don't flash "unliked → liked". Falls back to `false` when the user
   * is signed out (anonymous viewers can still watch).
   */
  const [liked, setLiked] = useState(false);
  useEffect(() => {
    if (!post) return;
    setLiked(likedIdsArr.includes(post.id));
  }, [likedIdsArr, post]);

  const handleLike = useCallback(async () => {
    if (!post) return;
    const willBeLiked = !liked;
    setLiked(willBeLiked);
    bumpPostCount(post.id, 'likeCount', willBeLiked ? 1 : -1);
    if (!user) return;
    try {
      await postsService.toggleLike(user.id, post.id);
      queryClient.invalidateQueries({ queryKey: likedPostKeys.forUser(user.id) });
    } catch {
      enqueueAction({
        type: willBeLiked ? 'like_post' : 'unlike_post',
        payload: { postId: post.id, userId: user.id },
      }).catch(() => {});
    }
  }, [liked, post, user]);

  const handleSave = useCallback(async () => {
    if (!post) return;
    const wasSaved = savedPostIds.has(post.id);
    toggleSavePost(post.id);
    bumpPostCount(post.id, 'saveCount', wasSaved ? -1 : 1);
    if (!user) return;
    try {
      await postsService.toggleSave(user.id, post.id);
      queryClient.invalidateQueries({ queryKey: savedPostKeys.forUser(user.id) });
    } catch (e: unknown) {
      enqueueAction({
        type: wasSaved ? 'unsave_post' : 'save_post',
        payload: { postId: post.id, userId: user.id },
      }).catch(() => {});
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as Error).message)
          : 'Save failed';
      toast.show(msg.length > 100 ? `${msg.slice(0, 97)}…` : msg, 'error');
    }
  }, [post, user, savedPostIds, toggleSavePost, toast]);

  const handleFollow = useCallback(async () => {
    if (!post || !post.creatorId) return;
    if (post.creatorId === user?.id) return;
    const wasFollowing = followedCreatorIds.has(post.creatorId);
    setCreatorFollowed(post.creatorId, !wasFollowing);
    if (!user) return;
    try {
      await profilesService.toggleFollow(user.id, post.creatorId);
      queryClient.invalidateQueries({ queryKey: userKeys.detail(post.creatorId) });
    } catch (e: unknown) {
      enqueueAction({
        type: wasFollowing ? 'unfollow_user' : 'follow_user',
        payload: { followerId: user.id, followingId: post.creatorId },
      }).catch(() => {});
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as Error).message)
          : 'Follow failed';
      toast.show(msg.length > 100 ? `${msg.slice(0, 97)}…` : msg, 'error');
    }
  }, [post, user, followedCreatorIds, setCreatorFollowed, toast]);

  if (isLoading || !post) return <LoadingState />;

  return (
    <View style={styles.container}>
      <VideoFeedPost
        post={post}
        isActive
        isLiked={liked}
        isSaved={savedPostIds.has(post.id)}
        isFollowing={followedCreatorIds.has(post.creatorId)}
        onLike={handleLike}
        onComment={() => router.push(`/comments/${post.id}` as any)}
        onSave={handleSave}
        /**
         * Carry the optional `circle` slug through to the share menu so
         * pins shared from here retain the Circle attribution (accent /
         * anonymous masking). Falls through to the native sheet for
         * anonymous rooms — sharePostMenu handles that gracefully.
         */
        onShare={() =>
          sharePostMenu(post, {
            toast: toast.show,
            queryClient,
            circleSlug: circle ? String(circle) : undefined,
          })
        }
        onFollow={handleFollow}
        onProfile={() => router.push(`/profile/${post.creatorId}` as any)}
        onHashtag={(tag) =>
          router.push(`/hashtag/${encodeURIComponent(tag)}` as any)
        }
      />
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
        accessibilityLabel="Back"
      >
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 30,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
