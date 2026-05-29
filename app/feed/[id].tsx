import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, AppState, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { VideoFeedPost } from '@/components/feed/VideoFeedPost';
import { FeedCommentsSheet } from '@/components/feed/FeedCommentsSheet';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePost } from '@/hooks/useQueries';
import { openPulsePage } from '@/lib/navigation/pulsePageRoutes';
import { useFeedEngagement } from '@/hooks/useFeedEngagement';
import { useFeedCommentsSheet } from '@/hooks/useFeedCommentsSheet';
import { useToast } from '@/components/ui/Toast';

/**
 * Single-post fullscreen feed viewer. Opened by deep-links (including
 * taps on My Pulse clip / Circle-post cards) so visitors can watch the
 * ORIGINAL video in the exact same TikTok-style shell the main feed
 * uses, with real engagement wiring (like / save / share / follow /
 * comment) backed by the same mutations and optimistic cache patches
 * as `app/(tabs)/feed.tsx`.
 */
export default function FeedPostScreen() {
  const { id, circle } = useLocalSearchParams<{ id: string; circle?: string }>();
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const circleSlug = circle ? String(circle) : undefined;

  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  const [videoSurfaceEpoch, setVideoSurfaceEpoch] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setAppIsActive(next === 'active');
      if (next === 'active') {
        SplashScreen.hideAsync().catch(() => {});
        if (Platform.OS !== 'web') setVideoSurfaceEpoch((e) => e + 1);
      }
    });
    return () => sub.remove();
  }, []);

  const { data: post, isLoading } = usePost(id);

  const {
    savedPostIds,
    followedCreatorIds,
    toggleLike,
    handleToggleSave,
    handleToggleFollow,
    handleShare,
    isPostLiked,
    bumpRowUi,
  } = useFeedEngagement({ defaultCircleSlug: circleSlug });
  const { commentsPost, commentsOpen, openComments, closeComments } = useFeedCommentsSheet();

  if (isLoading || !post) return <LoadingState />;

  return (
    <View style={styles.container}>
      <VideoFeedPost
        post={post}
        videoSurfaceEpoch={videoSurfaceEpoch}
        isActive={isFocused && appIsActive}
        isLiked={isPostLiked(post.id)}
        isSaved={savedPostIds.has(post.id)}
        isFollowing={followedCreatorIds.has(post.creatorId)}
        onLike={() => void toggleLike(post.id)}
        onComment={() => {
          if (post.commentsDisabled) {
            toast.show('Comments are off — you can still read the thread.', 'info');
          }
          openComments(post);
        }}
        onSave={() => void handleToggleSave(post.id)}
        onShare={() => handleShare(post, { circleSlug })}
        onFollow={() => void handleToggleFollow(post.creatorId)}
        onProfile={() => openPulsePage(router, post.creatorId)}
        onOpenCreatorVideos={
          post.type === 'video' && post.mediaUrl?.trim() && !post.isAnonymous
            ? () =>
                router.push(
                  `/creator-videos/${post.creatorId}?fromPost=${encodeURIComponent(post.id)}` as any,
                )
            : undefined
        }
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

      <FeedCommentsSheet
        visible={commentsOpen}
        post={commentsPost}
        onClose={closeComments}
        circleSlug={circleSlug ?? null}
        onCommentAdded={bumpRowUi}
      />
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
