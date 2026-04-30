import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  View, FlatList, StyleSheet, Dimensions, Platform,
  TouchableOpacity, Text, ViewToken, ScrollView, AppState,
  NativeSyntheticEvent, NativeScrollEvent, RefreshControl,
  useWindowDimensions, type LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { avatarThumb } from '@/lib/storage';
import { VideoFeedPost } from '@/components/feed/VideoFeedPost';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ReportModal } from '@/components/ui/ReportModal';
import { LongPressMenu } from '@/components/feed/LongPressMenu';
import { useFeedInfinite, useLikedPostIds, usePrefetchPostsByIds } from '@/hooks/useQueries';
import { useViewTracker } from '@/hooks/useViewTracker';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import { FEED_TABS } from '@/constants';
import { colors } from '@/theme';
import { useToast } from '@/components/ui/Toast';
import { sharePostMenu } from '@/lib/share';
import { postsService, feedSignalsService, profilesService } from '@/services/supabase';
import { queryClient } from '@/lib/queryClient';
import { bumpPostCount } from '@/lib/postCacheUpdates';
import { enqueueAction } from '@/lib/offlineQueue';
import { feedKeys, likedPostKeys, savedPostKeys, userKeys } from '@/lib/queryKeys';
import type { Post, FeedType } from '@/types';

const VIDEO_BG = colors.media.videoCanvas;
const { height: SCREEN_H } = Dimensions.get('window');
/** Must match app/(tabs)/_layout tabBarStyle height or paging breaks (blank / misaligned pages). */
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 86 : 68;

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 60,
  minimumViewTime: 100,
};

export default function FeedScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const toast = useToast();
  const feedTab = useAppStore((s) => s.feedTab);
  const setFeedTab = useAppStore((s) => s.setFeedTab);
  const savedPostIds = useAppStore((s) => s.savedPostIds);
  const followedCreatorIds = useAppStore((s) => s.followedCreatorIds);
  const toggleSavePost = useAppStore((s) => s.toggleSavePost);
  const setCreatorFollowed = useAppStore((s) => s.setCreatorFollowed);

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
    isPending,
    isFetching,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error: feedError,
  } = useFeedInfinite(feedTab, user?.id);
  const posts = useMemo(() => feedInfData?.pages.flatMap((p) => p.posts) ?? [], [feedInfData]);
  const { data: likedIdsArr = [] } = useLikedPostIds(user?.id);

  /**
   * Batch-prefetch every visible cell's attributed sound source in a
   * single DB round-trip. Without this, each `VideoFeedPost` cell whose
   * `soundSourcePostId` lacks an inline `soundSourceMediaUrl` would
   * fire its own `usePost` query (~one network call per cell — classic
   * N+1). With this, the cache is seeded on the next paint and the
   * per-cell `usePost` returns instantly from cache.
   */
  const soundSourceIds = useMemo(
    () =>
      posts
        .filter((p) => p.type === 'video' && !p.soundSourceMediaUrl?.trim() && p.soundSourcePostId)
        .map((p) => p.soundSourcePostId!),
    [posts],
  );
  usePrefetchPostsByIds(soundSourceIds);

  /**
   * Pre-warm `expo-image`'s memory + disk cache for the next 8 cells'
   * creator avatars so they're decoded before the cell mounts. Pairs
   * with the `avatarThumb()` transform helper — both reduce visible
   * "pop-in" during fast scroll.
   */
  useEffect(() => {
    if (posts.length === 0) return;
    const upcoming = posts
      .slice(0, 8)
      .map((p) => avatarThumb(p.creator.avatarUrl, 36))
      .filter((u) => !!u);
    if (upcoming.length > 0) {
      void ExpoImage.prefetch(upcoming);
    }
  }, [posts]);
  const { onViewStart, onViewEnd } = useViewTracker(user?.id);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [feedTab]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setAppIsActive(next === 'active');
    });
    return () => sub.remove();
  }, []);

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const likedServerSig = likedIdsArr.join('|');
  useEffect(() => {
    setLikedPosts(new Set(likedIdsArr));
  }, [likedServerSig]);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [longPressTarget, setLongPressTarget] = useState<Post | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const prevActiveId = useRef<string | null>(null);
  const activePostIdRef = useRef<string | null>(null);
  /** Synced each render; read from `renderItem` without listing `activePostId` in `useCallback` deps (avoids new renderItem every snap). */
  activePostIdRef.current = activePostId;

  /**
   * When the feed query result changes, keep the current post if it still exists; otherwise jump to the first item.
   * Do not depend on `activePostId` here — if it flickers null, we must not reset to index 0 while the user has scrolled.
   */
  useEffect(() => {
    const list = posts ?? [];
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
      if (prevActiveId.current) onViewEnd(prevActiveId.current);
      if (nextId) onViewStart(nextId);
      prevActiveId.current = nextId;
      setActivePostId(nextId);
    }
  }, [posts, onViewStart, onViewEnd]);

  /** Paging feed: derive the focused clip from scroll offset (viewableItems[0] is not reliably the snapped page). */
  const syncActiveFromScrollOffset = useCallback(
    (offsetY: number) => {
      if (Platform.OS === 'web') return;
      const list = posts ?? [];
      if (!list.length || pageHeight <= 0) return;

      const idx = Math.round(offsetY / pageHeight);
      const clamped = Math.max(0, Math.min(list.length - 1, idx));
      const newId = list[clamped]?.id ?? null;

      if (newId === prevActiveId.current) return;
      if (prevActiveId.current) onViewEnd(prevActiveId.current);
      if (newId) onViewStart(newId);
      prevActiveId.current = newId;
      setActivePostId(newId);
    },
    [posts, pageHeight, onViewStart, onViewEnd],
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

  const toggleLike = useCallback(async (id: string) => {
    /**
     * Capture the optimistic-flip target so that, if the server call fails,
     * we can enqueue exactly the action the user intended (like vs. unlike)
     * and replay it from `processQueue` once the network / server recovers.
     * Without this, a failed unlike would silently re-like on retry.
     */
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
    /**
     * Patch the cached post.likeCount in place so the number next to the heart
     * updates on tap. We deliberately avoid invalidating ['feed'] / ['feedInf']
     * (which would refetch and flash the active video on Android) -- see the
     * note above. The natural pull-to-refresh path will reconcile against the
     * server-side trigger total later.
     */
    bumpPostCount(id, 'likeCount', willBeLiked ? 1 : -1);
    if (user) {
      try {
        await postsService.toggleLike(user.id, id);
        /**
         * Only invalidate the user's liked-id set — invalidating ['feed'] /
         * ['feedInf'] here forces an immediate refetch that swaps the posts
         * array reference and re-renders every cell, which on Android causes
         * the active video surface to flash / shift. The denormalised
         * post.likeCount refreshes on the next pull-to-refresh; the heart
         * state is already correct via the local likedPosts set above.
         */
        queryClient.invalidateQueries({ queryKey: likedPostKeys.forUser(user.id) });
      } catch {
        /**
         * Best-effort: stash the action so processQueue() can flush it on
         * next foreground / reconnect. We deliberately keep the optimistic
         * UI flip — the queued action is what ultimately reconciles state.
         */
        enqueueAction({
          type: willBeLiked ? 'like_post' : 'unlike_post',
          payload: { postId: id, userId: user.id },
        }).catch(() => {});
      }
    }
  }, [user]);

  const openCreatorVideoGrid = useCallback(
    (creatorId: string, postId: string) => {
      router.push(`/creator-videos/${creatorId}?fromPost=${encodeURIComponent(postId)}` as any);
    },
    [router],
  );

  const handleToggleSave = useCallback(async (id: string) => {
    const wasSaved = savedPostIds.has(id);
    toggleSavePost(id);
    /**
     * Patch the cached post.saveCount so the bookmark count ticks instantly
     * on tap. Without this, a freshly saved post sticks at "0" until the
     * user manually pull-to-refreshes (the bug being fixed here).
     */
    bumpPostCount(id, 'saveCount', wasSaved ? -1 : 1);
    if (user) {
      try {
        await postsService.toggleSave(user.id, id);
        queryClient.invalidateQueries({
          queryKey: savedPostKeys.forUser(user.id),
          refetchType: 'all',
        });
      } catch (e: unknown) {
        /**
         * Server call failed -- don't roll back the optimistic flip; instead
         * queue the intended action so it replays on reconnect. This is the
         * key resilience win: a flaky network never silently drops a save.
         */
        enqueueAction({
          type: wasSaved ? 'unsave_post' : 'save_post',
          payload: { postId: id, userId: user.id },
        }).catch(() => {});
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Save failed';
        toast.show(msg.length > 100 ? `${msg.slice(0, 97)}…` : msg, 'error');
      }
    }
  }, [user, savedPostIds, toggleSavePost, toast]);

  const handleToggleFollow = useCallback(async (creatorId: string) => {
    if (!creatorId || creatorId === user?.id) return;
    /** Optimistic flip — server call below confirms / queues on failure. */
    const wasFollowing = followedCreatorIds.has(creatorId);
    setCreatorFollowed(creatorId, !wasFollowing);
    if (!user) return;
    try {
      await profilesService.toggleFollow(user.id, creatorId);
      queryClient.invalidateQueries({ queryKey: userKeys.detail(creatorId) });
    } catch (e: unknown) {
      enqueueAction({
        type: wasFollowing ? 'unfollow_user' : 'follow_user',
        payload: { followerId: user.id, followingId: creatorId },
      }).catch(() => {});
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Follow failed';
      toast.show(msg.length > 100 ? `${msg.slice(0, 97)}…` : msg, 'error');
    }
  }, [user, followedCreatorIds, setCreatorFollowed, toast]);

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

  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <VideoFeedPost
        post={item}
        viewportHeight={pageHeight}
        isActive={isFocused && appIsActive && item.id === activePostIdRef.current}
        isLiked={likedPosts.has(item.id)}
        isSaved={savedPostIds.has(item.id)}
        isFollowing={followedCreatorIds.has(item.creatorId)}
        onLike={() => toggleLike(item.id)}
        onComment={() => router.push(`/comments/${item.id}`)}
        onSave={() => handleToggleSave(item.id)}
        onShare={() => sharePostMenu(item, { toast: toast.show, queryClient })}
        onFollow={() => handleToggleFollow(item.creatorId)}
        onProfile={() => router.push(`/profile/${item.creatorId}`)}
        onCommunity={async (cId) => {
          try {
            const { communitiesService } = await import('@/services/supabase');
            const c = await communitiesService.getById(cId);
            if (c?.slug) router.push(`/communities/${c.slug}`);
          } catch {
            /* noop */
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
    [likedPosts, savedPostIds, followedCreatorIds, router, toggleLike, handleToggleSave, handleToggleFollow, isFocused, appIsActive, pageHeight, openCreatorVideoGrid],
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  /**
   * Bounded signature for FlatList `extraData` so paging (active id) and per-row chips update,
   * without joining every liked/saved id in the app (which blew up VirtualizedList updates).
   */
  const feedListExtraData = useMemo(() => {
    const list = posts ?? [];
    if (!list.length) return activePostId ?? '';
    const likes = list.map((p) => (likedPosts.has(p.id) ? '1' : '0')).join('');
    const saves = list.map((p) => (savedPostIds.has(p.id) ? '1' : '0')).join('');
    const follows = list.map((p) => (followedCreatorIds.has(p.creatorId) ? '1' : '0')).join('');
    return `${activePostId}|${likes}|${saves}|${follows}`;
  }, [posts, activePostId, likedPosts, savedPostIds, followedCreatorIds]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: pageHeight,
      offset: pageHeight * index,
      index,
    }),
    [pageHeight],
  );

  if (isPending && !feedInfData) return <LoadingState />;
  if (isError) {
    const hint =
      __DEV__ && feedError != null
        ? `${feedError instanceof Error ? feedError.message : String(feedError)}\n\nPull down to refresh or tap retry.`
        : 'Pull down to refresh or tap retry';
    return <ErrorState title="Couldn't load feed" subtitle={hint} onRetry={() => refetch()} />;
  }

  const feedPosts = posts ?? [];

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
        onEndReachedThreshold={0.45}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.onVideo.mutedStrong, fontWeight: '600' }}>Loading more…</Text>
            </View>
          ) : null
        }
        pagingEnabled={Platform.OS !== 'web'}
        showsVerticalScrollIndicator={false}
        snapToInterval={Platform.OS !== 'web' && pageHeight > 0 ? pageHeight : undefined}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        removeClippedSubviews={Platform.OS === 'android'}
        /**
         * Prefetch buffer: render 2 cells immediately (active + next) and
         * keep up to 3 cells warm during fast scrolling. Each mounted
         * `VideoFeedPost` instantiates its own `useVideoPlayer`, which
         * begins buffering the source as soon as the cell mounts —
         * so by the time the user scrolls to the next clip, the player
         * is already past the manifest fetch + initial bytes and
         * playback starts in ~0 ms instead of the 800–1500 ms it took
         * when we mounted lazily on scroll. (TikTok-style pre-roll.)
         *
         * `windowSize={5}` keeps a 2-up / 2-down window of mounted
         * cells around the active index, so backwards scroll is also
         * instant. The trade-off is ~50 MB of extra RAM for video
         * surfaces — well within budget on any phone we support.
         */
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        initialNumToRender={2}
        {...(Platform.OS === 'web'
          ? { viewabilityConfigCallbackPairs: viewabilityConfigCallbackPairs.current }
          : {
              onMomentumScrollEnd,
              onScrollEndDrag,
            })}
        ListEmptyComponent={<FeedEmptyState height={pageHeight > 0 ? pageHeight : SCREEN_H} />}
      />

      <View style={[styles.feedChrome, { paddingTop: insets.top + 6 }]}>
        <View style={styles.chromeSide} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
          style={styles.tabScrollFlex}
        >
          {FEED_TABS.map((tab) => {
            const isActive = tab.key === feedTab;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => setFeedTab(tab.key as FeedType)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                {isActive ? <View style={styles.tabUnderline} /> : <View style={styles.tabUnderlineSpacer} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity
          onPress={() => router.push('/search')}
          style={styles.searchBtn}
          hitSlop={10}
          accessibilityLabel="Search"
        >
          <Ionicons name="search-outline" size={22} color={colors.dark.text} />
        </TouchableOpacity>
      </View>

      <ReportModal
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType="post"
        targetId={reportTarget ?? ''}
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
        onNotInterested={async () => {
          const p = longPressTarget;
          if (!user?.id || !p) return;
          try {
            await feedSignalsService.recordAction(user.id, 'not_interested', { postId: p.id });
            queryClient.invalidateQueries({ queryKey: feedKeys.root() });
            queryClient.invalidateQueries({ queryKey: feedKeys.infiniteRoot() });
            toast.show('We will show fewer posts like this', 'success');
          } catch {
            toast.show('Could not update feed', 'error');
          }
        }}
        onHideCreator={async () => {
          const p = longPressTarget;
          if (!user?.id || !p) return;
          try {
            await feedSignalsService.recordAction(user.id, 'hide_creator', { creatorId: p.creatorId });
            queryClient.invalidateQueries({ queryKey: feedKeys.root() });
            queryClient.invalidateQueries({ queryKey: feedKeys.infiniteRoot() });
            toast.show('Hidden this creator from your feed', 'success');
          } catch {
            toast.show('Could not update feed', 'error');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: VIDEO_BG },
  feedChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: colors.feed.chromeScrim,
  },
  chromeSide: { width: 44 },
  tabScrollFlex: { flex: 1, maxHeight: 44 },
  tabScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 4,
    paddingHorizontal: 4,
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.15,
    color: colors.feed.tabInactive,
  },
  tabLabelActive: {
    color: colors.onVideo.primary,
    fontWeight: '800',
  },
  tabUnderline: {
    marginTop: 6,
    height: 3,
    width: 22,
    borderRadius: 2,
    backgroundColor: colors.primary.teal,
  },
  tabUnderlineSpacer: {
    marginTop: 6,
    height: 3,
    width: 22,
  },
  searchBtn: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
