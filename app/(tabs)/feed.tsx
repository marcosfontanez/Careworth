import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  View, FlatList, StyleSheet, Dimensions, Platform,
  Text, ViewToken, AppState,
  NativeSyntheticEvent, NativeScrollEvent, RefreshControl,
  InteractionManager,
  useWindowDimensions, type LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { avatarThumb } from '@/lib/storage';
import { pickAbCoverUrl } from '@/lib/coverAbPoster';
import { VideoFeedPost } from '@/components/feed/VideoFeedPost';
import { FeedCommentsSheet } from '@/components/feed/FeedCommentsSheet';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import { FeedErrorState } from '@/components/feed/FeedErrorState';
import { FeedLoadingSkeleton } from '@/components/feed/FeedLoadingSkeleton';
import { FeedTopChrome } from '@/components/feed/FeedTopChrome';
import { FeedHappeningNowTray } from '@/components/feed/FeedHappeningNowTray';
import { ReportModal } from '@/components/ui/ReportModal';
import { LongPressMenu } from '@/components/feed/LongPressMenu';
import { useFeedInfinite, usePrefetchPostsByIds } from '@/hooks/useQueries';
import { useFeedEngagement } from '@/hooks/useFeedEngagement';
import { useFeedCommentsSheet } from '@/hooks/useFeedCommentsSheet';
import { useFeedLiveDiscovery } from '@/hooks/useFeedLiveDiscovery';
import { useViewTracker } from '@/hooks/useViewTracker';
import { useFeatureFlags } from '@/lib/featureFlags';
import { adsService } from '@/services/monetization';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import { useBorderGovernorScreenFocus } from '@/hooks/useBorderGovernorScreenFocus';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/theme';
import { queryClient } from '@/lib/queryClient';
import { navigateToCircleRoom } from '@/lib/communityCache';
import { normalizeCommunitySlug } from '@/lib/communitySlug';
import { liveStreamHref } from '@/lib/navigation/liveRoutes';
import { openPulsePage } from '@/lib/navigation/pulsePageRoutes';
import { getFeedVideoListWindow } from '@/lib/feedVideoListWindow';
import type { Post } from '@/types';

const VIDEO_BG = colors.media.videoCanvas;
const { height: SCREEN_H } = Dimensions.get('window');
/** Must match app/(tabs)/_layout tabBarStyle height or paging breaks (blank / misaligned pages). */
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 86 : 68;

/** Avatars / posters / image slides warmed around the focused page (not only the first dozen cells). */
const FEED_WARM_RADIUS = 5;
/** Attributed-sound `getByIds` batch: only near the active index to avoid huge requests on long sessions. */
const FEED_SOUND_WARM_RADIUS = 4;
/** Start loading the next infinite page before the user hits the true tail. */
const FETCH_NEXT_WHEN_WITHIN = 6;
const MAX_IMAGE_PREFETCH_URLS = 36;
/** In-feed sponsored card slot (0-indexed) on For You only. */
const SPONSORED_FEED_INSERT_INDEX = 2;

function feedWindowRange(len: number, centerIdx: number, radius: number) {
  if (len <= 0) return { start: 0, end: 0 };
  const c = Math.max(0, Math.min(len - 1, centerIdx));
  return {
    start: Math.max(0, c - radius),
    end: Math.min(len, c + radius + 1),
  };
}
const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 60,
  minimumViewTime: 100,
};

export default function FeedScreen() {
  const feedListWindow = useMemo(() => getFeedVideoListWindow(), []);
  const router = useRouter();
  const isFocused = useIsFocused();
  useBorderGovernorScreenFocus();
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading } = useAuth();
  const toast = useToast();
  const feedTab = useAppStore((s) => s.feedTab);
  const setFeedTab = useAppStore((s) => s.setFeedTab);
  const { activeLives } = useFeedLiveDiscovery(feedTab === 'forYou');

  const { height: windowH } = useWindowDimensions();
  const [pageHeight, setPageHeight] = useState(() =>
    Platform.OS === 'web' ? windowH : Math.max(320, windowH - TAB_BAR_HEIGHT),
  );

  useEffect(() => {
    if (Platform.OS === 'web') setPageHeight(windowH);
    else setPageHeight((h) => Math.max(320, windowH - TAB_BAR_HEIGHT));
  }, [windowH]);

  const onFeedLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 1) setPageHeight(h);
  }, []);

  const {
    data: feedInfData,
    dataUpdatedAt,
    isPending,
    isFetching,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error: feedError,
  } = useFeedInfinite(feedTab, user?.id, !authLoading);

  /**
   * Refresh when returning to Feed so new posts appear — but skip if we already
   * fetched recently (`useFeedInfinite` staleTime is 60s). Unconditional `refetch()`
   * on every tab blur→focus duplicated ranked-merge + continuation work and spiked
   * Supabase load during rapid tab switching.
   */
  useFocusEffect(
    useCallback(() => {
      const minStaleMs = 60_000;
      if (feedInfData && Date.now() - dataUpdatedAt < minStaleMs) return;
      void refetch();
    }, [refetch, feedInfData, dataUpdatedAt]),
  );

  const posts = useMemo(() => feedInfData?.pages.flatMap((p) => p.posts) ?? [], [feedInfData]);

  const sponsoredPostsEnabled = useFeatureFlags((s) => s.sponsoredPosts);
  const sponsoredPlacementDelivery = useFeatureFlags((s) => s.sponsoredPlacementDelivery);
  const [sponsoredPost, setSponsoredPost] = useState<Post | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (feedTab !== 'forYou' || !user?.id || !sponsoredPostsEnabled || !sponsoredPlacementDelivery) {
      setSponsoredPost(null);
      return () => {
        cancelled = true;
      };
    }
    void adsService.getSponsoredPostForFeed().then((post) => {
      if (!cancelled) setSponsoredPost(post);
    });
    return () => {
      cancelled = true;
    };
  }, [feedTab, user?.id, sponsoredPostsEnabled, sponsoredPlacementDelivery, dataUpdatedAt]);

  const feedPosts = useMemo(() => {
    const base = posts ?? [];
    if (feedTab !== 'forYou' || !sponsoredPost) return base;
    if (base.some((p) => p.id === sponsoredPost.id)) return base;
    const copy = [...base];
    const idx = Math.min(SPONSORED_FEED_INSERT_INDEX, copy.length);
    copy.splice(idx, 0, sponsoredPost);
    return copy;
  }, [posts, sponsoredPost, feedTab]);

  const {
    likedPostsRef,
    savedPostIds,
    savedPostIdsRef,
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
  } = useFeedEngagement();
  const { commentsPost, commentsOpen, openComments, closeComments } = useFeedCommentsSheet();

  const { onViewStart, onViewEnd } = useViewTracker(user?.id);
  const flatListRef = useRef<FlatList>(null);
  /** Incremented when app returns to foreground so the active `expo-video` surface can remount (black GL layer recovery). */
  const [videoSurfaceEpoch, setVideoSurfaceEpoch] = useState(0);

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [feedTab]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setAppIsActive(next === 'active');
      if (next === 'active') {
        SplashScreen.hideAsync().catch(() => {});
        if (Platform.OS !== 'web') {
          setVideoSurfaceEpoch((e) => e + 1);
        }
      }
    });
    return () => sub.remove();
  }, []);

  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [longPressTarget, setLongPressTarget] = useState<Post | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [liveTrayPinned, setLiveTrayPinned] = useState(false);
  const prevActiveId = useRef<string | null>(null);
  const activePostIdRef = useRef<string | null>(null);
  /** Synced each render; read from `renderItem` without listing `activePostId` in `useCallback` deps (avoids new renderItem every snap). */
  activePostIdRef.current = activePostId;

  useEffect(() => {
    if (!activePostId?.startsWith('sponsored-')) return;
    const post = feedPosts.find((p) => p.id === activePostId);
    const campaignId = post?.sponsorInfo?.campaignId;
    if (campaignId) void adsService.trackImpression(campaignId);
  }, [activePostId, feedPosts]);

  /** Index of the snapped “page”; drives windowed prefetch so deep scrolls warm the right neighbors. */
  const activeWarmIndex = useMemo(() => {
    if (!feedPosts.length) return 0;
    if (!activePostId) return 0;
    const i = feedPosts.findIndex((p) => p.id === activePostId);
    return i >= 0 ? i : 0;
  }, [feedPosts, activePostId]);

  useEffect(() => {
    if (activeWarmIndex > 0) setLiveTrayPinned(false);
  }, [activeWarmIndex]);

  /**
   * Batch attributed-sound posts for the warm window only (single `getByIds`).
   * Cells outside the window resolve via per-cell `usePost` if the user jumps quickly.
   */
  const soundSourceIds = useMemo(() => {
    const { start, end } = feedWindowRange(posts.length, activeWarmIndex, FEED_SOUND_WARM_RADIUS);
    return posts
      .slice(start, end)
      .filter((p) => p.type === 'video' && !p.soundSourceMediaUrl?.trim() && p.soundSourcePostId)
      .map((p) => p.soundSourcePostId!);
  }, [posts, activeWarmIndex]);

  usePrefetchPostsByIds(soundSourceIds);

  /**
   * Pre-warm `expo-image` for avatars, video posters, and image-carousel URLs around the active page.
   */
  useEffect(() => {
    if (posts.length === 0) return;
    const { start, end } = feedWindowRange(posts.length, activeWarmIndex, FEED_WARM_RADIUS);
    const slice = posts.slice(start, end);
    const avatars = slice
      .map((p) => avatarThumb(p.creator.avatarUrl, 36))
      .filter((u): u is string => !!u);
    const posters = slice
      .map((p) => pickAbCoverUrl(p) ?? p.thumbnailUrl?.trim())
      .filter((u): u is string => !!u);
    const imageUrls: string[] = [];
    for (const p of slice) {
      if (p.type !== 'image') continue;
      const main = p.mediaUrl?.trim();
      const extras = (p.additionalMedia ?? [])
        .map((u) => u?.trim())
        .filter((u): u is string => Boolean(u));
      if (main) imageUrls.push(main);
      imageUrls.push(...extras);
    }
    const upcoming = [...new Set([...avatars, ...posters, ...imageUrls])].slice(0, MAX_IMAGE_PREFETCH_URLS);
    if (upcoming.length === 0) return;
    const task = InteractionManager.runAfterInteractions(() => {
      void ExpoImage.prefetch(upcoming, 'memory-disk');
    });
    return () => task.cancel?.();
  }, [posts, activeWarmIndex]);

  /** Load more before the last page so the next swipe rarely waits on the network. */
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || posts.length === 0) return;
    if (activeWarmIndex >= posts.length - FETCH_NEXT_WHEN_WITHIN) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, posts.length, activeWarmIndex, fetchNextPage]);

  /**
   * When the feed query result changes, keep the current post if it still exists; otherwise jump to the first item.
   * Do not depend on `activePostId` here — if it flickers null, we must not reset to index 0 while the user has scrolled.
   */
  useEffect(() => {
    const list = feedPosts ?? [];
    if (!list.length) {
      if (prevActiveId.current) {
        onViewEnd(prevActiveId.current);
        prevActiveId.current = null;
      }
      setActivePostId(null);
      return;
    }

    const cur = activePostIdRef.current;
    const stillInFeed = cur != null && list.some((p) => p.id === cur);
    const nextId = stillInFeed ? cur : list[0].id;

    if (nextId !== prevActiveId.current) {
      if (prevActiveId.current && !prevActiveId.current.startsWith('sponsored-')) {
        onViewEnd(prevActiveId.current);
      }
      if (nextId && !nextId.startsWith('sponsored-')) onViewStart(nextId);
      prevActiveId.current = nextId;
      setActivePostId(nextId);
    }
  }, [feedPosts, onViewStart, onViewEnd]);

  /** Paging feed: derive the focused clip from scroll offset (viewableItems[0] is not reliably the snapped page). */
  const syncActiveFromScrollOffset = useCallback(
    (offsetY: number) => {
      if (Platform.OS === 'web') return;
      const list = feedPosts ?? [];
      if (!list.length || pageHeight <= 0) return;

      const idx = Math.round(offsetY / pageHeight);
      const clamped = Math.max(0, Math.min(list.length - 1, idx));
      const newId = list[clamped]?.id ?? null;

      if (newId === prevActiveId.current) return;
      if (prevActiveId.current && !prevActiveId.current.startsWith('sponsored-')) {
        onViewEnd(prevActiveId.current);
      }
      if (newId && !newId.startsWith('sponsored-')) onViewStart(newId);
      prevActiveId.current = newId;
      setActivePostId(newId);
    },
    [feedPosts, pageHeight, onViewStart, onViewEnd],
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

  const openCreatorVideoGrid = useCallback(
    (creatorId: string, postId: string) => {
      router.push(`/creator-videos/${creatorId}?fromPost=${encodeURIComponent(postId)}` as any);
    },
    [router],
  );

  const handleLiveNowPress = useCallback(() => {
    if (feedTab !== 'forYou') {
      setFeedTab('forYou');
    }
    setLiveTrayPinned(true);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [feedTab, setFeedTab]);

  const dismissLiveTray = useCallback(() => {
    setLiveTrayPinned(false);
  }, []);

  const openLiveStream = useCallback(
    (streamId: string) => {
      router.push(liveStreamHref(streamId));
    },
    [router],
  );

  const showFeedLiveTray =
    feedTab === 'forYou' &&
    activeLives.length > 0 &&
    (activeWarmIndex === 0 || liveTrayPinned);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const topItem = viewableItems[0];
      const newActiveId = topItem?.item?.id ?? null;

      if (newActiveId !== prevActiveId.current) {
        if (prevActiveId.current && !prevActiveId.current.startsWith('sponsored-')) {
          onViewEnd(prevActiveId.current);
        }
        if (newActiveId && !newActiveId.startsWith('sponsored-')) onViewStart(newActiveId);
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
        onCommunity={async (cId) => {
          const raw = cId.trim();
          if (!raw) {
            toast.show('Circle not found', 'error');
            return;
          }
          try {
            const { communitiesService } = await import('@/services/supabase');
            const UUID_RE =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const community = UUID_RE.test(raw)
              ? await communitiesService.getById(raw)
              : await communitiesService.getBySlug(normalizeCommunitySlug(raw));
            if (community?.slug) {
              navigateToCircleRoom(router, queryClient, community, user?.id ?? null);
              return;
            }
            toast.show('Circle not found or unavailable', 'error');
          } catch {
            toast.show('Could not open Circle — try again', 'error');
          }
        }}
        onReport={() => setReportTarget(item.id)}
        onLongPress={() => setLongPressTarget(item)}
        onHashtag={(tag) => router.push(`/hashtag/${encodeURIComponent(tag)}`)}
        onOpenCreatorVideos={
          item.type === 'video' && item.mediaUrl?.trim() && !item.isAnonymous
            ? () => openCreatorVideoGrid(item.creatorId, item.id)
            : undefined
        }
      />
    ),
    [router, toggleLike, handleToggleSave, handleToggleFollow, handleShare, isFocused, appIsActive, pageHeight, openCreatorVideoGrid, queryClient, videoSurfaceEpoch, toast, user?.id, openComments],
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  /**
   * Compact `extraData`: paging (`activePostId`) plus a generation tick bumped only when
   * like/save/follow state or server liked-ids hydrate changes. Avoids O(n) strings over the
   * whole feed on every scroll snapshot.
   */
  const feedListExtraData = useMemo(
    () => `${activePostId ?? ''}|${rowUiEpoch}|${isFocused ? 1 : 0}|${appIsActive ? 1 : 0}`,
    [activePostId, rowUiEpoch, isFocused, appIsActive],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: pageHeight,
      offset: pageHeight * index,
      index,
    }),
    [pageHeight],
  );

  if (isPending && !feedInfData) return <FeedLoadingSkeleton />;
  if (isError) {
    const hint =
      __DEV__ && feedError != null
        ? feedError instanceof Error
          ? feedError.message
          : typeof feedError === 'object' &&
              feedError !== null &&
              'message' in feedError &&
              typeof (feedError as { message: unknown }).message === 'string'
            ? (feedError as { message: string }).message
            : String(feedError)
        : undefined;
    return (
      <View style={styles.container} onLayout={onFeedLayout}>
        <FeedErrorState
          height={pageHeight > 0 ? pageHeight : SCREEN_H}
          subtitle={hint ?? 'Pull down to refresh or try again.'}
          onRetry={() => refetch()}
        />
        <FeedTopChrome
          insetTop={insets.top}
          activeTab={feedTab}
          onTabChange={setFeedTab}
          onSearch={() => router.push('/search')}
          showLiveNowIndicator={activeLives.length > 0}
          onLiveNowPress={activeLives.length > 0 ? handleLiveNowPress : undefined}
        />
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onFeedLayout}>
      <FlatList
        ref={flatListRef}
        data={feedPosts}
        extraData={feedListExtraData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(isFetching && !isFetchingNextPage && !!feedInfData)}
            onRefresh={() => refetch()}
            tintColor={colors.primary.teal}
            progressViewOffset={insets.top + 48}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.55}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.onVideo.mutedStrong, fontWeight: '600' }}>Loading more…</Text>
            </View>
          ) : null
        }
        pagingEnabled={Platform.OS !== 'web'}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={Platform.OS === 'ios' ? 16 : 32}
        snapToInterval={Platform.OS !== 'web' && pageHeight > 0 ? pageHeight : undefined}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        /**
         * Android + `expo-video`: clipping “off-screen” rows while decoders are still
         * tearing down causes native SIGABRT / `libmedia_jni` crashes (comments, scroll,
         * post flows). Keep rows attached like iOS; tune `windowSize` instead.
         */
        removeClippedSubviews={false}
        /**
         * Prefetch buffer: render 2 cells immediately (active + next) and
         * keep neighbors warm during fast scrolling. Each mounted
         * `VideoFeedPost` instantiates its own `useVideoPlayer`, which
         * begins buffering the source as soon as the cell mounts —
         * so by the time the user scrolls to the next clip, the player
         * is already past the manifest fetch + initial bytes and
         * playback starts in ~0 ms instead of the 800–1500 ms it took
         * when we mounted lazily on scroll. (TikTok-style pre-roll.)
         *
         * Trade-off: extra RAM for video surfaces — `feedVideoListWindow` keeps
         * Android slightly tighter than iOS to reduce decoder contention.
         */
        maxToRenderPerBatch={feedListWindow.maxToRenderPerBatch}
        updateCellsBatchingPeriod={50}
        windowSize={feedListWindow.windowSize}
        initialNumToRender={feedListWindow.initialNumToRender}
        {...(Platform.OS === 'web'
          ? { viewabilityConfigCallbackPairs: viewabilityConfigCallbackPairs.current }
          : {
              onMomentumScrollEnd,
              onScrollEndDrag,
            })}
        ListEmptyComponent={
          <FeedEmptyState
            height={pageHeight > 0 ? pageHeight : SCREEN_H}
            tab={feedTab}
            onExplore={() => router.push('/search')}
          />
        }
      />

      <FeedTopChrome
        insetTop={insets.top}
        activeTab={feedTab}
        onTabChange={setFeedTab}
        onSearch={() => router.push('/search')}
        showLiveNowIndicator={activeLives.length > 0}
        onLiveNowPress={activeLives.length > 0 ? handleLiveNowPress : undefined}
      />

      {showFeedLiveTray ? (
        <FeedHappeningNowTray
          streams={activeLives}
          onOpenStream={openLiveStream}
          insetTop={insets.top}
          onDismiss={dismissLiveTray}
        />
      ) : null}

      <ReportModal
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType="post"
        targetId={reportTarget ?? ''}
      />

      <FeedCommentsSheet
        visible={commentsOpen}
        post={commentsPost}
        onClose={closeComments}
        onCommentAdded={bumpRowUi}
      />

      <LongPressMenu
        post={longPressTarget}
        onClose={() => setLongPressTarget(null)}
        onReport={() => {
          if (longPressTarget) setReportTarget(longPressTarget.id);
          setLongPressTarget(null);
        }}
        onSave={() => {
          if (longPressTarget) handleToggleSave(longPressTarget.id);
          setLongPressTarget(null);
        }}
        isSaved={longPressTarget ? savedPostIds.has(longPressTarget.id) : false}
        canBlockCreator={!!user?.id && longPressTarget?.creatorId !== user.id}
        onNotInterested={() => {
          const p = longPressTarget;
          if (!p) return;
          void handleNotInterested(p.id);
        }}
        onHideCreatorFromFeed={() => {
          const p = longPressTarget;
          if (!p) return;
          void handleHideCreatorFromFeed(p.creatorId);
        }}
        onBlockCreator={() => {
          const p = longPressTarget;
          if (!p) return;
          void handleBlockCreator(p.creatorId, p.creator.displayName);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: VIDEO_BG },
});
