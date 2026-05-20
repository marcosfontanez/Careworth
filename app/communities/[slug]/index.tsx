import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  InteractionManager,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorState } from '@/components/ui/ErrorState';
import { useCommunity, useCommunityPosts, useCircleThreads, useLikedPostIds, useCircleViewerPostReactions } from '@/hooks/useQueries';
import { CircleThreadCard } from '@/components/circles/CircleThreadCard';
import { CircleRoomHeader } from '@/components/circles/CircleRoomHeader';
import { CircleHighlightsRow } from '@/components/circles/CircleHighlightsRow';
import { CircleModeChips, type CircleMode } from '@/components/circles/CircleModeChips';
import { CirclePostCard } from '@/components/circles/CirclePostCard';
import { EditPostCaptionModal } from '@/components/posts/EditPostCaptionModal';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import { communityService } from '@/services';
import { communitiesService, postsService } from '@/services/supabase';
import { colors } from '@/theme';
import { shareCommunity, sharePostMenu } from '@/lib/share';
import { useToast } from '@/components/ui/Toast';
import { isAnonymousConfessionCircle } from '@/lib/anonymousCircle';
import { getCircleAccent } from '@/lib/circleAccents';
import { patchPostReactionCounts } from '@/lib/postCacheUpdates';
import { enqueueAction } from '@/lib/offlineQueue';
import { circleContentKeys, communityKeys, likedPostKeys } from '@/lib/queryKeys';
import { invalidatePostRelatedQueries } from '@/lib/invalidatePostQueries';
import { hrefCommunityThread, hrefPost, hrefTabCircles } from '@/lib/communityRoutes';
import {
  getThreadReadReplyCount,
  hasSeenCircleQuestionsHint,
  setCircleQuestionsHintSeen,
  isCommunityMuted,
  setCommunityMuted,
} from '@/lib/circleExperience';
import type { CircleThread, Post, PostReactionKind } from '@/types';
import { feedPerfEnabled, feedPerfLog, feedPerfNow } from '@/lib/feedPerf';
import { getCommunityWallFeedListWindow } from '@/lib/feedVideoListWindow';
import { normalizeCommunitySlug } from '@/lib/communitySlug';

const COMMUNITY_WALL_LIST_WINDOW = getCommunityWallFeedListWindow();

function prettySlugLabel(raw: string) {
  const s = raw.trim();
  if (!s) return 'Circle';
  return s
    .split('-')
    .filter(Boolean)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

/** Hot score used to rank "Top" — same shape we used in the previous version. */
function hotScore(post: Post): number {
  const age = (Date.now() - new Date(post.createdAt).getTime()) / 3600000;
  return (post.likeCount + post.commentCount * 2 + post.shareCount * 3) / Math.pow(age + 2, 1.5);
}

export default function CommunityDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[]; focusPost?: string | string[] }>();
  const segments = useSegments();
  const slugFromSegments = useMemo(() => {
    const segs = segments as string[];
    const i = segs.indexOf('communities');
    if (i < 0 || i >= segs.length - 1) return '';
    return normalizeCommunitySlug(segs[i + 1]);
  }, [segments]);

  const slug = useMemo(() => {
    const fromParam = normalizeCommunitySlug(params.slug);
    return fromParam || slugFromSegments;
  }, [params.slug, slugFromSegments]);

  const focusPostId = useMemo(() => {
    const raw = params.focusPost;
    const s = Array.isArray(raw) ? raw[0] : raw;
    return (s ?? '').trim() || undefined;
  }, [params.focusPost]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const {
    data: community,
    isPending,
    isError,
    isFetching,
    fetchStatus: communityFetchStatus,
    refetch,
  } = useCommunity(slug);
  /** Ignore cached rows from another slug (defense if anything primes the wrong key). */
  const activeCommunity =
    community && normalizeCommunitySlug(community.slug) === slug ? community : undefined;
  const staleSlugMismatch = Boolean(
    community && slug && normalizeCommunitySlug(community.slug) !== slug,
  );
  const communityQuerySettled = !isPending && !isFetching;
  const slugMismatchAfterSettled = communityQuerySettled && staleSlugMismatch;
  /**
   * Drop mismatched rows immediately (persisted cache / bad primes). Otherwise
   * `refetchOnMount` keeps `isFetching` true while the row never matches the URL,
   * and `(isFetching || staleSlugMismatch)` traps the room on “Loading circle…”
   * until navigation resets the observer.
   */
  useLayoutEffect(() => {
    if (!slug || community == null) return;
    if (normalizeCommunitySlug(community.slug) === slug) return;
    queryClient.removeQueries({ queryKey: ['community', slug], exact: true });
  }, [slug, community, queryClient]);
  /** True pending or cache row that doesn’t match the URL (cleared in layout effect). */
  const showRoomLoadingShell =
    !!slug &&
    !isError &&
    !activeCommunity &&
    !slugMismatchAfterSettled &&
    (isPending || staleSlugMismatch);
  const joinedIds = useAppStore((s) => s.joinedCommunityIds);
  const setCommunityJoined = useAppStore((s) => s.setCommunityJoined);

  const [mode, setMode] = useState<CircleMode>('top');
  const [refreshing, setRefreshing] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const popularityBumpKeyRef = useRef<string | null>(null);
  const perfRoomT0Ref = useRef<number | null>(null);
  const perfPostsLoggedRef = useRef<string | null>(null);
  const perfListLaidOutRef = useRef<string | null>(null);
  const wallListRef = useRef<FlatList<Post | CircleThread>>(null);
  const focusScrollDoneRef = useRef<string | null>(null);
  const [jumpHighlightPostId, setJumpHighlightPostId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const cid = activeCommunity?.id;
      if (!cid || !user?.id) return;
      const sig = cid;
      if (popularityBumpKeyRef.current === sig) return;
      popularityBumpKeyRef.current = sig;
      void communitiesService.bumpProfileOpen(cid);
      return () => {
        popularityBumpKeyRef.current = null;
      };
    }, [activeCommunity?.id, user?.id]),
  );

  /** Local liked-set hydrated from the server query (mirrors feed.tsx so a
   *  user's existing likes show as filled hearts the moment the room opens). */
  const { data: likedIdsArr = [] } = useLikedPostIds(user?.id);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const likedSig = likedIdsArr.join('|');
  useEffect(() => {
    setLikedPosts(new Set(likedIdsArr));
  }, [likedSig, likedIdsArr]);

  const {
    data: allPosts,
    refetch: refetchPosts,
    isWallInitialLoading,
    isError: postsError,
  } = useCommunityPosts(activeCommunity?.id ?? '');
  const postsStillLoading = isWallInitialLoading;
  const {
    data: circleThreadsRaw,
    refetch: refetchThreads,
    isThreadsInitialLoading,
  } = useCircleThreads(slug, activeCommunity?.id);
  const circleThreads = circleThreadsRaw ?? [];

  useEffect(() => {
    if (!__DEV__) return;
    const cid = activeCommunity?.id ?? '';
    // eslint-disable-next-line no-console -- intentional dev-only Circle room diagnostics
    console.log('[circleRoom:diag]', {
      slug: slug || undefined,
      slugFromSegments: slugFromSegments || undefined,
      activeCommunityId: cid || undefined,
      communityRowSlug: community?.slug,
      communityQuery: {
        isPending,
        isFetching,
        isError,
        fetchStatus: communityFetchStatus,
      },
      wall: {
        enabled: !!cid,
        isWallInitialLoading,
        hasPostsData: allPosts !== undefined,
        postsError,
      },
      threads: {
        isThreadsInitialLoading,
        count: circleThreadsRaw?.length ?? 0,
      },
    });
  }, [
    slug,
    slugFromSegments,
    activeCommunity?.id,
    community?.slug,
    isPending,
    isFetching,
    isError,
    communityFetchStatus,
    isWallInitialLoading,
    allPosts,
    postsError,
    isThreadsInitialLoading,
    circleThreadsRaw?.length,
  ]);

  useEffect(() => {
    perfRoomT0Ref.current = feedPerfNow();
    perfPostsLoggedRef.current = null;
    perfListLaidOutRef.current = null;
  }, [slug]);

  useEffect(() => {
    if (!feedPerfEnabled || !activeCommunity?.id || perfRoomT0Ref.current == null) return;
    feedPerfLog('circleRoom:community', perfRoomT0Ref.current, slug);
  }, [activeCommunity?.id, slug]);

  useEffect(() => {
    if (
      !feedPerfEnabled ||
      !activeCommunity?.id ||
      allPosts === undefined ||
      perfRoomT0Ref.current == null
    ) {
      return;
    }
    const sig = `${activeCommunity.id}:${allPosts.length}`;
    if (perfPostsLoggedRef.current === sig) return;
    perfPostsLoggedRef.current = sig;
    feedPerfLog('circleRoom:wallPosts', perfRoomT0Ref.current, `${allPosts.length} posts`);
  }, [allPosts, activeCommunity?.id]);

  const { data: liveStats } = useQuery({
    queryKey: ['communityCardStats', activeCommunity?.id],
    queryFn: async () => {
      const m = await communitiesService.getCardStatsForIds([activeCommunity!.id]);
      return m.get(activeCommunity!.id) ?? null;
    },
    enabled: !!activeCommunity?.id,
    staleTime: 30_000,
  });

  const threadsSorted = useMemo(() => {
    return [...circleThreads].sort(
      (a, b) =>
        b.reactionCount + b.replyCount * 2 - (a.reactionCount + a.replyCount * 2),
    );
  }, [circleThreads]);

  const postsList = useMemo(() => {
    const raw = [...(allPosts ?? [])];
    if (mode === 'video') {
      const posts = raw.filter((p) => p.type === 'video' || p.type === 'image');
      posts.sort((a, b) => hotScore(b) - hotScore(a));
      return posts;
    }
    if (mode === 'fresh') {
      return raw.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (mode === 'top') {
      return raw.sort((a, b) => hotScore(b) - hotScore(a));
    }
    return raw;
  }, [allPosts, mode]);

  const wallPostIds = useMemo(() => postsList.map((p) => p.id), [postsList]);
  const postIdsSig = useMemo(() => [...wallPostIds].sort().join(','), [wallPostIds]);

  useEffect(() => {
    focusScrollDoneRef.current = null;
  }, [slug, focusPostId]);

  useEffect(() => {
    if (!focusPostId || !allPosts?.length) return;
    if (!allPosts.some((p) => p.id === focusPostId)) return;
    if (mode === 'questions') {
      setMode('top');
      return;
    }
    if (!postsList.some((p) => p.id === focusPostId)) {
      setMode('top');
    }
  }, [focusPostId, allPosts, postsList, mode]);

  useEffect(() => {
    if (!focusPostId || mode === 'questions' || postsStillLoading) return;
    if (!postsList.length) return;
    const idx = postsList.findIndex((p) => p.id === focusPostId);
    if (idx < 0) return;
    const sig = `${slug}:${focusPostId}`;
    if (focusScrollDoneRef.current === sig) return;

    let highlightClear: ReturnType<typeof setTimeout> | undefined;
    const scrollTimer = setTimeout(() => {
      try {
        wallListRef.current?.scrollToIndex({
          index: idx,
          viewPosition: 0.1,
          animated: true,
        });
        focusScrollDoneRef.current = sig;
        setJumpHighlightPostId(focusPostId);
        highlightClear = setTimeout(() => setJumpHighlightPostId(null), 2200);
      } catch {
        /* FlatList may call onScrollToIndexFailed */
      }
    }, 200);
    return () => {
      clearTimeout(scrollTimer);
      if (highlightClear) clearTimeout(highlightClear);
    };
  }, [focusPostId, mode, postsList, slug, postsStillLoading]);

  const { data: viewerReactionsMap = {} } = useCircleViewerPostReactions(activeCommunity?.id ?? '', wallPostIds);

  const viewerReactionForPost = useCallback(
    (postId: string): PostReactionKind | null => {
      const v = viewerReactionsMap[postId];
      if (v) return v;
      if (likedPosts.has(postId)) return 'heart';
      return null;
    },
    [viewerReactionsMap, likedPosts],
  );

  const videoPostCount = useMemo(
    () => (allPosts ?? []).filter((p) => p.type === 'video' || p.type === 'image').length,
    [allPosts],
  );

  const [threadReadMap, setThreadReadMap] = useState<Record<string, number>>({});
  const [showQuestionsHint, setShowQuestionsHint] = useState(false);
  const [roomMuted, setRoomMuted] = useState(false);
  const [showCirclesNavHint, setShowCirclesNavHint] = useState(false);
  const [captionEditPost, setCaptionEditPost] = useState<Post | null>(null);

  useEffect(() => {
    let cancelled = false;
    const handle = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        const entries = await Promise.all(
          threadsSorted.map(async (t) => [t.id, (await getThreadReadReplyCount(t.id)) ?? -1] as const),
        );
        if (!cancelled) setThreadReadMap(Object.fromEntries(entries));
      })();
    });
    return () => {
      cancelled = true;
      handle.cancel();
    };
  }, [threadsSorted]);

  useEffect(() => {
    const cid = activeCommunity?.id;
    setShowCirclesNavHint(false);
    if (!cid) return;
    void (async () => {
      const [hint, mutedLocal] = await Promise.all([
        hasSeenCircleQuestionsHint(),
        isCommunityMuted(cid),
      ]);
      let muted = mutedLocal;
      if (user?.id && joinedIds.has(cid)) {
        try {
          const alertsOn = await communityService.getCirclePostAlerts(cid);
          if (alertsOn === false) muted = true;
        } catch {
          /* local mute only */
        }
      }
      setShowQuestionsHint(!hint);
      setRoomMuted(muted);
    })();
  }, [activeCommunity?.id, user?.id, joinedIds]);

  useFocusEffect(
    useCallback(() => {
      if (!activeCommunity?.id) return;
      void refetchPosts();
      void refetchThreads();
    }, [activeCommunity?.id, refetchPosts, refetchThreads]),
  );

  /**
   * Web + first paint: `useFocusEffect` can run before `activeCommunity?.id` exists and never
   * re-fire when the id hydrates (screen already focused). Kick wall + threads once the
   * room identity is known so the list does not sit on “Loading…” until a manual back/re-enter.
   */
  useEffect(() => {
    if (!slug || !activeCommunity?.id) return;
    void refetchPosts();
    void refetchThreads();
  }, [slug, activeCommunity?.id, refetchPosts, refetchThreads]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchPosts(), refetchThreads()]);
    setRefreshing(false);
  }, [refetch, refetchPosts, refetchThreads]);

  const handleJoinPress = useCallback(async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    const cid = activeCommunity?.id;
    if (!cid) return;
    const wasJoined = joinedIds.has(cid);

    const afterJoinInvalidate = async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community', slug] }),
        queryClient.invalidateQueries({ queryKey: communityKeys.circlesHome() }),
        queryClient.invalidateQueries({ queryKey: ['communityCardStats', cid] }),
        queryClient.invalidateQueries({ queryKey: ['communities'] }),
      ]);
    };

    const finishJoin = async (notifyNewPosts: boolean) => {
      try {
        const joined = await communityService.toggleJoin(cid, { notifyNewPosts });
        setCommunityJoined(cid, joined);
        if (notifyNewPosts) await setCommunityMuted(cid, false);
        else await setCommunityMuted(cid, true);
        await afterJoinInvalidate();
        if (joined && !wasJoined) {
          toast.show(`You're in ${activeCommunity?.name ?? 'this circle'}!`, 'success');
          setShowCirclesNavHint(true);
        }
      } catch {
        /* keep optimistic UI */
      }
    };

    if (!wasJoined) {
      Alert.alert(
        'Stay in the loop?',
        'Get notified when someone posts in this circle. You can change this anytime under About this circle.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Join without alerts', onPress: () => void finishJoin(false) },
          { text: 'Join & notify me', onPress: () => void finishJoin(true) },
        ],
      );
      return;
    }

    try {
      const joined = await communityService.toggleJoin(cid);
      setCommunityJoined(cid, joined);
      await setCommunityMuted(cid, false);
      await afterJoinInvalidate();
      if (!joined) setShowCirclesNavHint(false);
    } catch {
      /* keep optimistic UI */
    }
  }, [
    user,
    activeCommunity?.id,
    activeCommunity?.name,
    slug,
    joinedIds,
    setCommunityJoined,
    queryClient,
    router,
    toast,
  ]);

  const handleCreatePost = useCallback(
    (intent?: 'meme' | 'thread' | 'question' | 'video') => {
      if (!activeCommunity) return;
      const params = new URLSearchParams({
        communityId: activeCommunity.id,
        communityName: activeCommunity.name,
        communitySlug: activeCommunity.slug,
      });
      if (intent) params.set('intent', intent);
      router.push(`/communities/create-post?${params.toString()}`);
    },
    [activeCommunity, router],
  );

  /* ---------- Per-card actions (reuse the same patterns as feed.tsx) ---------- */

  const handleCircleWallReaction = useCallback(
    async (post: Post, kind: PostReactionKind) => {
      if (!user?.id || !activeCommunity?.id) return;
      const cur = viewerReactionForPost(post.id);
      const next = cur === kind ? null : kind;

      patchPostReactionCounts(post.id, cur, next);
      queryClient.setQueryData(
        circleContentKeys.viewerPostReactions(activeCommunity.id, user.id, postIdsSig),
        (old: Partial<Record<string, PostReactionKind>> | undefined) => {
          const o = { ...(old ?? {}) };
          if (next == null) delete o[post.id];
          else o[post.id] = next;
          return o;
        },
      );
      setLikedPosts((prev) => {
        const n = new Set(prev);
        if (next == null) n.delete(post.id);
        else n.add(post.id);
        return n;
      });

      try {
        await postsService.setPostReaction(user.id, post.id, next);
        void queryClient.invalidateQueries({ queryKey: likedPostKeys.forUser(user.id) });
      } catch {
        patchPostReactionCounts(post.id, next, cur);
        queryClient.setQueryData(
          circleContentKeys.viewerPostReactions(activeCommunity.id, user.id, postIdsSig),
          (old: Partial<Record<string, PostReactionKind>> | undefined) => {
            const o = { ...(old ?? {}) };
            if (cur == null) delete o[post.id];
            else o[post.id] = cur;
            return o;
          },
        );
        setLikedPosts((prev) => {
          const n = new Set(prev);
          if (cur == null) n.delete(post.id);
          else n.add(post.id);
          return n;
        });
        enqueueAction({
          type: 'set_post_reaction',
          payload: { userId: user.id, postId: post.id, reaction: next },
        }).catch(() => {});
      }
    },
    [user?.id, activeCommunity?.id, viewerReactionForPost, postIdsSig, queryClient],
  );

  const handleShare = useCallback(
    async (post: Post) => {
      /**
       * Bring the same two-option share chooser we use on the main feed
       * into the room so members can pin a great circle post to their My
       * Pulse with one tap. We carry the circle slug through so the pin
       * opens back into the room-scoped detail screen (preserving accent +
       * anonymous masking). Anonymous confession rooms opt out of the
       * Pulse option — pinning there would undo the whole point of the
       * room by attaching the poster's handle to a public profile card.
       */
      const anonymous = isAnonymousConfessionCircle(slug);
      await sharePostMenu(
        { ...post, isAnonymous: post.isAnonymous || anonymous },
        {
          toast: toast.show,
          queryClient,
          circleSlug: slug,
          allowPulseShare: !anonymous,
        },
      );
    },
    [slug, toast, queryClient],
  );

  const handleDeletePostInCircle = useCallback(
    (post: Post) => {
      if (!user?.id || !activeCommunity?.id) return;
      Alert.alert('Delete Post', 'Are you sure you want to delete this post? This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await postsService.deleteOwnPost(post.id, user.id);
              await invalidatePostRelatedQueries(queryClient, { creatorId: user.id });
              queryClient.setQueryData(
                circleContentKeys.communityPosts(activeCommunity.id, user.id),
                (old: Post[] | undefined) => (old ? old.filter((p) => p.id !== post.id) : old),
              );
              toast.show('Post deleted', 'success');
            } catch {
              toast.show('Failed to delete post', 'error');
            }
          },
        },
      ]);
    },
    [user?.id, activeCommunity?.id, queryClient, toast],
  );

  const openCirclePostOwnerMenu = useCallback(
    (post: Post) => {
      if (!user?.id || user.id !== post.creatorId) return;
      Alert.alert('Your post', undefined, [
        { text: 'Edit caption', onPress: () => setCaptionEditPost(post) },
        { text: 'Delete post', style: 'destructive', onPress: () => handleDeletePostInCircle(post) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [user?.id, handleDeletePostInCircle],
  );

  const handleSaveCaptionFromCircle = useCallback(
    async (nextCaption: string) => {
      if (!user?.id || !activeCommunity?.id || !captionEditPost) {
        throw new Error('Couldn’t save your edit. Try again.');
      }
      try {
        const updated = await postsService.updateOwnPost(captionEditPost.id, user.id, {
          caption: nextCaption,
        });
        await invalidatePostRelatedQueries(queryClient, { creatorId: user.id });
        queryClient.setQueryData(
          circleContentKeys.communityPosts(activeCommunity.id, user.id),
          (old: Post[] | undefined) => (old ? old.map((p) => (p.id === updated.id ? updated : p)) : old),
        );
        toast.show('Caption updated', 'success');
      } catch (e) {
        toast.show('Couldn’t save caption', 'error');
        throw e;
      }
    },
    [user?.id, activeCommunity?.id, captionEditPost, queryClient, toast],
  );

  if (!slug) {
    return (
      <ErrorState
        title="Missing circle link"
        subtitle="This URL doesn’t include a circle name."
        onRetry={() => router.back()}
      />
    );
  }

  if (isError && community == null) {
    return (
      <ErrorState
        title="Couldn’t load this circle"
        subtitle="Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  if (slug && slugMismatchAfterSettled) {
    return (
      <ErrorState
        title="Couldn’t open this circle"
        subtitle="Cached room data didn’t match this link. Tap retry to reload."
        onRetry={() => refetch()}
      />
    );
  }

  const shellAccent = getCircleAccent(slug);
  if (showRoomLoadingShell) {
    return (
      <View style={styles.container}>
        <CircleRoomHeader
          insetTop={insets.top}
          iconEmoji="✦"
          name="Loading…"
          description={prettySlugLabel(slug)}
          memberCount={0}
          onlineCount={0}
          isJoined={false}
          accent={shellAccent}
          showShare={false}
          onBack={() => router.back()}
          onShare={() => {}}
          onMore={() => {}}
          onJoin={() => {}}
          onCreatePost={() => {}}
        />
        <View style={styles.shellLoading}>
          <ActivityIndicator size="large" color={shellAccent.color} />
          <Text style={styles.shellLoadingText}>Loading circle…</Text>
        </View>
      </View>
    );
  }

  if (!activeCommunity) {
    return (
      <ErrorState
        title="Circle not found"
        subtitle="This room may have been removed, or the link may be out of date."
        onRetry={() => refetch()}
      />
    );
  }

  const isJoined = joinedIds.has(activeCommunity.id);
  const isAnonCircle = isAnonymousConfessionCircle(slug);
  const accent = getCircleAccent(slug, activeCommunity.accentColor);

  const memberCountLive = liveStats?.memberCount ?? activeCommunity.memberCount;
  const onlineCount = liveStats?.onlineCount ?? 0;

  const flatData: (Post | CircleThread)[] = mode === 'questions' ? threadsSorted : postsList;

  const wallPostsLoading = isWallInitialLoading;
  const questionsThreadsLoading = isThreadsInitialLoading;

  const ListHeader = (
    <View>
      <CircleRoomHeader
        insetTop={insets.top}
        iconEmoji={activeCommunity.icon}
        name={activeCommunity.name}
        /** Prefer the curated brief description when the room has one, so
         *  the banner reads cleaner than the older free-form DB blurb. */
        description={accent.description ?? activeCommunity.description}
        memberCount={memberCountLive}
        onlineCount={onlineCount}
        isJoined={isJoined}
        accent={accent}
        showShare={!isAnonCircle}
        onBack={() => router.back()}
        onShare={() => shareCommunity(activeCommunity.slug, activeCommunity.name)}
        onMore={() => setShowAbout((v) => !v)}
        onJoin={handleJoinPress}
        onCreatePost={() => handleCreatePost()}
      />

      {showCirclesNavHint ? (
        <TouchableOpacity
          style={styles.circlesNavHint}
          onPress={() => {
            setShowCirclesNavHint(false);
            router.push(hrefTabCircles('yours'));
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="View this circle under Your circles on the Circles tab"
        >
          <Ionicons name="people-outline" size={18} color={colors.primary.teal} />
          <Text style={styles.circlesNavHintText}>View in Your circles</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.dark.textMuted} />
        </TouchableOpacity>
      ) : null}

      {showAbout && (
        <AboutSheet
          accent={accent.color}
          description={activeCommunity.description}
          categories={activeCommunity.categories}
          isMember={isJoined}
          notificationsMuted={roomMuted}
          onToggleNotificationsMuted={async (next) => {
            if (!user?.id) return;
            try {
              await setCommunityMuted(activeCommunity.id, next);
              await communityService.setCirclePostAlerts(activeCommunity.id, !next);
              setRoomMuted(next);
              toast.show(
                next ? 'Circle alerts off (no new posts in your bell)' : 'Circle alerts on for new posts',
                'success',
              );
              void queryClient.invalidateQueries({ queryKey: ['notifications'] });
              void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
            } catch {
              toast.show('Couldn’t update alert settings', 'error');
            }
          }}
          onClose={() => setShowAbout(false)}
        />
      )}

      <CircleHighlightsRow
        posts={allPosts ?? []}
        threads={circleThreads}
        accent={accent}
        /** Anonymous rooms must never out a "Top Creator" — defeats the
         *  purpose of the room. Suppress the card entirely. */
        hideTopCreator={isAnonCircle}
        onSelectPost={(id) => router.push(hrefPost(id, activeCommunity.slug))}
        onSelectThread={(id) => router.push(hrefCommunityThread(activeCommunity.slug, id))}
        onSelectCreator={(uid) => router.push(`/profile/${uid}`)}
      />

      <CircleModeChips
        active={mode}
        accent={accent}
        onSelect={setMode}
        hideVideo={isAnonCircle || videoPostCount === 0}
      />

      {mode === 'questions' && showQuestionsHint ? (
        <View style={styles.hintBanner}>
          <Text style={styles.hintText}>
            Questions mode lists discussion threads — different from the wall tabs (Top / Fresh / Video).
          </Text>
          <TouchableOpacity
            onPress={() => {
              setShowQuestionsHint(false);
              void setCircleQuestionsHintSeen();
            }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss questions tab hint"
          >
            <Text style={[styles.hintDismiss, { color: accent.color }]}>Got it</Text>
          </TouchableOpacity>
        </View>
      ) : null}

    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={wallListRef}
        data={flatData}
        keyExtractor={(item) => item.id}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          if (index < 0 || !averageItemLength) return;
          wallListRef.current?.scrollToOffset({
            offset: Math.max(0, index * averageItemLength * 0.85),
            animated: true,
          });
        }}
        onLayout={() => {
          if (!feedPerfEnabled || perfRoomT0Ref.current == null) return;
          const sig = `${slug}:${activeCommunity.id}`;
          if (perfListLaidOutRef.current === sig) return;
          perfListLaidOutRef.current = sig;
          feedPerfLog('circleRoom:listFirstLayout', perfRoomT0Ref.current, slug);
        }}
        renderItem={({ item }) =>
          mode === 'questions' ? (
            <CircleThreadCard
              thread={item as CircleThread}
              circleName={activeCommunity.name}
              accent={accent.color}
              isAnonymousRoom={isAnonCircle}
              hasNewActivity={(() => {
                const t = item as CircleThread;
                const last = threadReadMap[t.id];
                return typeof last === 'number' && last >= 0 && t.replyCount > last;
              })()}
              onPress={() =>
                router.push(hrefCommunityThread(activeCommunity.slug, (item as CircleThread).id))
              }
              onProfile={() => router.push(`/profile/${(item as CircleThread).authorId}` as never)}
            />
          ) : (
            <CirclePostCard
              post={item as Post}
              accent={accent}
              isAnonymousRoom={isAnonCircle}
              viewerReaction={viewerReactionForPost((item as Post).id)}
              isOwner={!!user?.id && user.id === (item as Post).creatorId}
              onOwnerMenu={() => openCirclePostOwnerMenu(item as Post)}
              jumpHighlight={jumpHighlightPostId === (item as Post).id}
              onPress={() =>
                router.push(
                  `/post/${(item as Post).id}?circle=${encodeURIComponent(activeCommunity.slug)}` as any,
                )
              }
              onProfile={() => router.push(`/profile/${(item as Post).creatorId}`)}
              onReply={() => {
                const p = item as Post;
                const base = `/post/${p.id}?circle=${encodeURIComponent(activeCommunity.slug)}`;
                if (p.commentsDisabled) {
                  toast.show('Comments are off for this post.', 'info');
                  router.push(base as never);
                  return;
                }
                router.push(`${base}&focusComments=1` as never);
              }}
              onPickReaction={(k) => {
                if (!user) {
                  router.push('/auth/login');
                  return;
                }
                void handleCircleWallReaction(item as Post, k);
              }}
              onShare={() => handleShare(item as Post)}
            />
          )
        }
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={COMMUNITY_WALL_LIST_WINDOW.initialNumToRender}
        maxToRenderPerBatch={COMMUNITY_WALL_LIST_WINDOW.maxToRenderPerBatch}
        windowSize={COMMUNITY_WALL_LIST_WINDOW.windowSize}
        updateCellsBatchingPeriod={50}
        /* Android + expo-image: clipping off-screen rows often clears visible textures on scroll. */
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accent.color}
            title="Updating room…"
            titleColor={colors.dark.textMuted}
          />
        }
        ListEmptyComponent={
          mode === 'questions' ? (
            questionsThreadsLoading ? (
              <View style={styles.empty}>
                <ActivityIndicator size="large" color={accent.color} />
                <Text style={styles.emptyLoadingLabel}>Loading threads…</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.neutral.midGray} />
                <Text style={styles.emptyTitle}>No threads yet</Text>
                <Text style={styles.emptySubtitle}>
                  Ask a question or tell a story — your crew shows up fast.
                </Text>
                <TouchableOpacity
                  onPress={() => handleCreatePost('question')}
                  activeOpacity={0.85}
                  style={[styles.emptyCta, { backgroundColor: accent.color }]}
                >
                  <Ionicons name="create" size={16} color="#FFFFFF" />
                  <Text style={styles.emptyCtaText}>Start a discussion</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setMode('top');
                    handleCreatePost('thread');
                  }}
                  activeOpacity={0.85}
                  style={styles.emptyCtaSecondary}
                >
                  <Text style={[styles.emptyCtaSecondaryText, { color: accent.color }]}>
                    Or open Top → new thread
                  </Text>
                </TouchableOpacity>
              </View>
            )
          ) : postsError ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={40} color={colors.neutral.midGray} />
              <Text style={styles.emptyTitle}>Couldn’t load posts</Text>
              <Text style={styles.emptySubtitle}>Check your connection and try again.</Text>
              <TouchableOpacity
                onPress={() => void refetchPosts()}
                activeOpacity={0.85}
                style={[styles.emptyCta, { backgroundColor: accent.color }]}
              >
                <Text style={styles.emptyCtaText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : wallPostsLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={accent.color} />
              <Text style={styles.emptyLoadingLabel}>Loading posts…</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.neutral.midGray} />
              <Text style={styles.emptyTitle}>
                {mode === 'video' ? 'No video or photos yet' : 'No posts yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {mode === 'video'
                  ? 'Be the first to share a clip or photo in this room.'
                  : 'Be the first to start a conversation!'}
              </Text>
              <TouchableOpacity
                onPress={() => handleCreatePost(mode === 'video' ? 'video' : undefined)}
                activeOpacity={0.85}
                style={[styles.emptyCta, { backgroundColor: accent.color }]}
              >
                <Ionicons name="create" size={16} color="#FFFFFF" />
                <Text style={styles.emptyCtaText}>
                  {mode === 'video' ? 'Post a clip or photo' : 'Create the first post'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMode('questions');
                  handleCreatePost('thread');
                }}
                activeOpacity={0.85}
                style={styles.emptyCtaSecondary}
              >
                <Text style={[styles.emptyCtaSecondaryText, { color: accent.color }]}>
                  Or open Questions → new thread
                </Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
      <EditPostCaptionModal
        visible={captionEditPost != null}
        initialCaption={captionEditPost?.caption ?? ''}
        accent={accent.color}
        onSave={handleSaveCaptionFromCircle}
        onClose={() => setCaptionEditPost(null)}
      />
    </View>
  );
}

/**
 * Slim About sheet. Replaces the larger guidelines modal from the old
 * forum-style room with a lighter inline panel that stays consistent with
 * the new premium look. Triggered via the header's overflow button.
 */
function AboutSheet({
  accent,
  description,
  categories,
  isMember,
  notificationsMuted,
  onToggleNotificationsMuted,
  onClose,
}: {
  accent: string;
  description: string;
  categories: string[];
  isMember: boolean;
  notificationsMuted: boolean;
  onToggleNotificationsMuted: (muted: boolean) => void;
  onClose: () => void;
}) {
  const RULES = [
    'Be respectful and supportive of fellow healthcare workers',
    'No patient information — protect HIPAA at all times',
    'Stay on topic — keep discussions relevant to the community',
    'No spam, self-promotion, or recruiting without approval',
  ];
  return (
    <View style={aboutStyles.card}>
      <View style={aboutStyles.header}>
        <Text style={aboutStyles.title}>About this circle</Text>
        <TouchableOpacity onPress={onClose} hitSlop={6}>
          <Ionicons name="close" size={20} color={colors.dark.textMuted} />
        </TouchableOpacity>
      </View>
      <Text style={aboutStyles.desc}>{description}</Text>
      {isMember ? (
        <TouchableOpacity
          style={aboutStyles.muteRow}
          onPress={() => onToggleNotificationsMuted(!notificationsMuted)}
          activeOpacity={0.85}
          accessibilityRole="switch"
          accessibilityLabel={notificationsMuted ? 'Turn on circle post alerts' : 'Turn off circle post alerts'}
          accessibilityState={{ checked: notificationsMuted }}
        >
          <View style={{ flex: 1 }}>
            <Text style={aboutStyles.muteTitle}>New posts in this circle</Text>
            <Text style={aboutStyles.muteSub}>
              {notificationsMuted
                ? 'Off — you won’t get bell or push alerts for new wall posts here.'
                : 'On — we’ll alert you when members post to this circle’s wall.'}
            </Text>
          </View>
          <Ionicons
            name={notificationsMuted ? 'notifications-off-outline' : 'notifications-outline'}
            size={22}
            color={accent}
          />
        </TouchableOpacity>
      ) : (
        <Text style={aboutStyles.nonMemberHint}>
          Join this circle to choose whether you get alerts for new posts.
        </Text>
      )}
      <View style={aboutStyles.divider} />
      <Text style={aboutStyles.section}>Guidelines</Text>
      {RULES.map((rule, i) => (
        <View key={i} style={aboutStyles.ruleRow}>
          <View style={[aboutStyles.ruleNum, { backgroundColor: `${accent}20` }]}>
            <Text style={[aboutStyles.ruleNumText, { color: accent }]}>{i + 1}</Text>
          </View>
          <Text style={aboutStyles.ruleText}>{rule}</Text>
        </View>
      ))}
      {categories.length > 0 && (
        <>
          <View style={aboutStyles.divider} />
          <Text style={aboutStyles.section}>Categories</Text>
          <View style={aboutStyles.catRow}>
            {categories.map((cat, i) => (
              <View key={i} style={aboutStyles.catChip}>
                <Text style={aboutStyles.catText}>{cat}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const aboutStyles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: colors.dark.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '800', color: colors.dark.text },
  desc: { fontSize: 13.5, color: colors.dark.textSecondary, lineHeight: 19 },
  nonMemberHint: {
    fontSize: 12.5,
    color: colors.dark.textMuted,
    marginTop: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  muteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingVertical: 10,
  },
  muteTitle: { fontSize: 14, fontWeight: '800', color: colors.dark.text },
  muteSub: { fontSize: 12, color: colors.dark.textMuted, marginTop: 4, lineHeight: 17 },
  divider: { height: 1, backgroundColor: colors.dark.border, marginVertical: 12 },
  section: { fontSize: 13, fontWeight: '700', color: colors.dark.text, marginBottom: 8 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  ruleNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ruleNumText: { fontSize: 11, fontWeight: '800' },
  ruleText: { flex: 1, fontSize: 12.5, color: colors.dark.textSecondary, lineHeight: 17 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.dark.cardAlt },
  catText: { fontSize: 12, fontWeight: '600', color: colors.dark.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  shellLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 12,
  },
  shellLoadingText: { fontSize: 14, fontWeight: '600', color: colors.dark.textMuted },
  hintBanner: {
    marginHorizontal: 12,
    marginTop: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(20,184,166,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hintText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.dark.textSecondary, fontWeight: '600' },
  hintDismiss: { fontSize: 12, fontWeight: '900' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.dark.text },
  emptySubtitle: { fontSize: 14, color: colors.dark.textMuted, textAlign: 'center' },
  emptyLoadingLabel: { fontSize: 14, fontWeight: '600', color: colors.dark.textMuted, marginTop: 8 },
  emptyCta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyCtaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  emptyCtaSecondary: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 12 },
  emptyCtaSecondaryText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  circlesNavHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.35)',
  },
  circlesNavHintText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark.text,
  },
});
