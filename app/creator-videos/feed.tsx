import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Platform,
  AppState,
  TouchableOpacity,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ViewToken,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { openPulsePage } from '@/lib/navigation/pulsePageRoutes';
import { VideoFeedPost } from '@/components/feed/VideoFeedPost';
import { FeedCommentsSheet } from '@/components/feed/FeedCommentsSheet';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { useUser, useUserPosts } from '@/hooks/useQueries';
import { useFeedEngagement } from '@/hooks/useFeedEngagement';
import { useFeedCommentsSheet } from '@/hooks/useFeedCommentsSheet';
import { useViewTracker } from '@/hooks/useViewTracker';
import { useToast } from '@/components/ui/Toast';
import {
  creatorVideoStartIndex,
  filterCreatorVideos,
  sortCreatorVideos,
  type CreatorVideoSort,
} from '@/lib/creatorVideosCatalog';
import { getFeedVideoListWindow } from '@/lib/feedVideoListWindow';
import type { Post } from '@/types';

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 60,
  minimumViewTime: 100,
};

function parseSort(raw: string | string[] | undefined): CreatorVideoSort {
  const s = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return s === 'popular' ? 'popular' : 'newest';
}

/**
 * Vertical TikTok-style viewer for one creator’s full video library.
 * Opened from the creator grid; swipe up/down through all clips, back returns to grid / main feed.
 */
export default function CreatorVideosFeedScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const pageHeight = Math.max(320, windowH);
  const feedListWindow = useMemo(() => getFeedVideoListWindow(), []);

  const params = useLocalSearchParams<{
    userId?: string | string[];
    start?: string | string[];
    sort?: string | string[];
  }>();
  const creatorId = (Array.isArray(params.userId) ? params.userId[0] : params.userId)?.trim() ?? '';
  const startPostId = (Array.isArray(params.start) ? params.start[0] : params.start)?.trim() ?? '';
  const sort = parseSort(params.sort);

  const { user } = useAuth();
  const toast = useToast();
  const { onViewStart, onViewEnd } = useViewTracker(user?.id);

  const {
    likedPostsRef,
    savedPostIdsRef,
    followedCreatorIdsRef,
    rowUiEpoch,
    bumpRowUi,
    toggleLike,
    handleToggleSave,
    handleToggleFollow,
    handleShare,
  } = useFeedEngagement();
  const { commentsPost, commentsOpen, openComments, closeComments } = useFeedCommentsSheet();

  const isOwner = !!user?.id && creatorId === user.id;
  const { data: profile, isLoading: profileLoading } = useUser(creatorId);
  const { data: posts, isLoading: postsLoading } = useUserPosts(creatorId);

  const privateBlocked = !isOwner && profile?.privacyMode === 'private';
  const privacyGateLoading = !isOwner && profile === undefined && profileLoading;

  const videos = useMemo(
    () => sortCreatorVideos(filterCreatorVideos(posts, isOwner, profile), sort),
    [posts, isOwner, profile, sort],
  );

  const initialIndex = useMemo(
    () => creatorVideoStartIndex(videos, startPostId),
    [videos, startPostId],
  );

  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  const [videoSurfaceEpoch, setVideoSurfaceEpoch] = useState(0);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const prevActiveId = useRef<string | null>(null);
  const activePostIdRef = useRef<string | null>(null);
  activePostIdRef.current = activePostId;
  const didInitialScroll = useRef(false);
  const flatListRef = useRef<FlatList<Post>>(null);

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

  useEffect(() => {
    if (!videos.length) {
      if (prevActiveId.current) {
        onViewEnd(prevActiveId.current);
        prevActiveId.current = null;
      }
      setActivePostId(null);
      return;
    }
    const nextId = videos[initialIndex]?.id ?? videos[0]?.id ?? null;
    if (nextId && nextId !== prevActiveId.current) {
      if (prevActiveId.current) onViewEnd(prevActiveId.current);
      if (nextId) onViewStart(nextId);
      prevActiveId.current = nextId;
      setActivePostId(nextId);
    }
  }, [videos, initialIndex, onViewStart, onViewEnd]);

  useEffect(() => {
    if (didInitialScroll.current || !videos.length || pageHeight <= 0) return;
    if (initialIndex <= 0) {
      didInitialScroll.current = true;
      return;
    }
    const t = setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: initialIndex * pageHeight,
        animated: false,
      });
      didInitialScroll.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, [videos.length, initialIndex, pageHeight]);

  const syncActiveFromScrollOffset = useCallback(
    (offsetY: number) => {
      if (Platform.OS === 'web') return;
      if (!videos.length || pageHeight <= 0) return;
      const idx = Math.round(offsetY / pageHeight);
      const clamped = Math.max(0, Math.min(videos.length - 1, idx));
      const newId = videos[clamped]?.id ?? null;
      if (newId === prevActiveId.current) return;
      if (prevActiveId.current) onViewEnd(prevActiveId.current);
      if (newId) onViewStart(newId);
      prevActiveId.current = newId;
      setActivePostId(newId);
    },
    [videos, pageHeight, onViewStart, onViewEnd],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncActiveFromScrollOffset(e.nativeEvent.contentOffset.y);
    },
    [syncActiveFromScrollOffset],
  );

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncActiveFromScrollOffset(e.nativeEvent.contentOffset.y);
    },
    [syncActiveFromScrollOffset],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const topItem = viewableItems[0];
      const newActiveId = topItem?.item?.id ?? null;
      if (newActiveId !== prevActiveId.current) {
        if (prevActiveId.current) onViewEnd(prevActiveId.current);
        if (newActiveId) onViewStart(newActiveId);
        prevActiveId.current = newActiveId;
      }
      setActivePostId(newActiveId);
    },
    [onViewStart, onViewEnd],
  );

  const onViewableItemsChangedRef = useRef(onViewableItemsChanged);
  onViewableItemsChangedRef.current = onViewableItemsChanged;

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: VIEWABILITY_CONFIG,
      onViewableItemsChanged: (info: { viewableItems: ViewToken[] }) =>
        onViewableItemsChangedRef.current(info),
    },
  ]);

  const openCreatorGrid = useCallback(() => {
    router.back();
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <VideoFeedPost
        post={item}
        viewportHeight={pageHeight}
        videoSurfaceEpoch={videoSurfaceEpoch}
        isActive={isFocused && appIsActive && item.id === activePostIdRef.current}
        isLiked={likedPostsRef.current.has(item.id)}
        isSaved={savedPostIdsRef.current.has(item.id)}
        isFollowing={followedCreatorIdsRef.current.has(item.creatorId)}
        onLike={() => toggleLike(item.id)}
        onComment={() => {
          if (item.commentsDisabled) {
            toast.show('Comments are off — you can still read the thread.', 'info');
          }
          openComments(item);
        }}
        onSave={() => handleToggleSave(item.id)}
        onShare={() => handleShare(item)}
        onFollow={() => handleToggleFollow(item.creatorId)}
        onProfile={() => openPulsePage(router, item.creatorId)}
        onHashtag={(tag) => router.push(`/hashtag/${encodeURIComponent(tag)}` as any)}
        onOpenCreatorVideos={openCreatorGrid}
      />
    ),
    [
      pageHeight,
      videoSurfaceEpoch,
      isFocused,
      appIsActive,
      toggleLike,
      handleToggleSave,
      handleToggleFollow,
      handleShare,
      router,
      toast,
      openCreatorGrid,
      openComments,
    ],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: pageHeight,
      offset: pageHeight * index,
      index,
    }),
    [pageHeight],
  );

  const listExtraData = useMemo(
    () => `${activePostId ?? ''}|${rowUiEpoch}|${isFocused ? 1 : 0}|${appIsActive ? 1 : 0}`,
    [activePostId, rowUiEpoch, isFocused, appIsActive],
  );

  if (!creatorId) {
    return <LoadingState />;
  }

  if (postsLoading || privacyGateLoading) {
    return <LoadingState />;
  }

  if (privateBlocked || videos.length === 0) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        extraData={listExtraData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled={Platform.OS !== 'web'}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={Platform.OS === 'ios' ? 16 : 32}
        snapToInterval={Platform.OS !== 'web' && pageHeight > 0 ? pageHeight : undefined}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
        removeClippedSubviews={false}
        maxToRenderPerBatch={feedListWindow.maxToRenderPerBatch}
        updateCellsBatchingPeriod={50}
        windowSize={feedListWindow.windowSize}
        initialNumToRender={feedListWindow.initialNumToRender}
        onScrollToIndexFailed={({ index }) => {
          flatListRef.current?.scrollToOffset({
            offset: index * pageHeight,
            animated: false,
          });
        }}
        {...(Platform.OS === 'web'
          ? { viewabilityConfigCallbackPairs: viewabilityConfigCallbackPairs.current }
          : { onMomentumScrollEnd, onScrollEndDrag })}
      />

      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
        accessibilityLabel="Back to video library"
      >
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.gridBtn, { top: insets.top + 8 }]}
        onPress={() =>
          router.replace(`/creator-videos/${creatorId}?fromPost=${encodeURIComponent(activePostId ?? startPostId)}` as any)
        }
        activeOpacity={0.7}
        accessibilityLabel="Show video grid"
      >
        <Ionicons name="grid-outline" size={22} color="#FFF" />
      </TouchableOpacity>

      <FeedCommentsSheet
        visible={commentsOpen}
        post={commentsPost}
        onClose={closeComments}
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
  gridBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 30,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
