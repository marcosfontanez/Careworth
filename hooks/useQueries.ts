import { useEffect, useMemo } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  feedService,
  communityService,
  userService,
  commentService,
  notificationService,
  profileUpdatesService,
  circleContentService,
} from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { streaksService } from '@/services/social/streaks';
import type { FeedType, Post, CircleThread } from '@/types';
import { postsService, profilesService, circleModerationService } from '@/services/supabase';
import {
  circleContentKeys,
  commentKeys,
  communityKeys,
  feedKeys,
  likedPostKeys,
  postKeys,
  profileUpdateKeys,
  userKeys,
} from '@/lib/queryKeys';
import { normalizeCommunitySlug } from '@/lib/communitySlug';
import {
  COMMUNITY_WALL_PAGE_SIZE,
  communityWallNextPageParam,
  flattenCommunityWallPages,
} from '@/lib/communityWallPostsCache';
import {
  COMMUNITY_THREADS_PAGE_SIZE,
  communityThreadsNextPageParam,
  flattenCommunityThreadPages,
} from '@/lib/communityThreadsCache';
import {
  COMMUNITY_REPLY_PAGE_SIZE,
  communityRepliesNextPageParam,
  flattenCommunityReplyPages,
} from '@/lib/communityRepliesCache';

export { useLiveStreams, useStream } from '@/hooks/useLiveQueries';

/**
 * Central React Query hooks for the mobile app. This file is large by design; prefer extracting
 * new domain hooks (e.g. `hooks/useLiveQueries.ts`, `hooks/queries/feed.ts`) and re-exporting here.
 */

/** Mirrors `postsService.getById` eligibility — non-live posts only resolve for the author. */
function linkedPostResolvableForViewer(post: Post, viewerId: string | null): boolean {
  const s = (post.scheduledStatus ?? 'live').trim().toLowerCase();
  if (s === 'live') return true;
  return viewerId != null && viewerId === post.creatorId;
}

/** React Query cache may hold a plain object instead of Map — normalize before `.get`. */
function normalizePostBatchMap(data: unknown): Map<string, Post> {
  if (data instanceof Map) return data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const m = new Map<string, Post>();
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (val && typeof val === 'object' && 'id' in val) m.set(key, val as Post);
    }
    return m;
  }
  return new Map();
}

/** Bump when feed queryFn shape changes so dev clients don’t keep a stale Fast Refresh closure. */
const FEED_QUERY_KEY_VERSION = 4;

export function useFeed(type: FeedType, userId?: string) {
  return useQuery({
    queryKey: ['feed', FEED_QUERY_KEY_VERSION, type, userId ?? null],
    queryFn: () => feedService.getFeed(type, userId),
    enabled: !!userId,
    /** Avoid re-running ranked merge on every tab focus/mount; pull-to-refresh still refetches. */
    staleTime: 60_000,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
  });
}

export function useLikedPostIds(userId?: string) {
  return useQuery({
    queryKey: likedPostKeys.forUser(userId),
    queryFn: async () => [...(await postsService.getLikedPostIdsForUser(userId!))],
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
  });
}

/** Paged feed: first page uses full ranked/chronological merge; later pages chronological tail. */
export function useFeedInfinite(type: FeedType, userId?: string) {
  return useInfiniteQuery({
    queryKey: feedKeys.infinitePage(type, userId),
    enabled: !!userId,
    initialPageParam: undefined as undefined | { cursor: string; seenIds: string[] },
    queryFn: async ({ pageParam }) => {
      if (!pageParam) {
        const posts = await postsService.getFeed(type, userId);
        const last = posts[posts.length - 1];
        return {
          posts,
          nextCursor: posts.length ? last.createdAt : null,
          seenIds: posts.map((p) => p.id),
        };
      }
      const { posts, nextCursor } = await postsService.getFeedContinuation({
        type,
        viewerId: userId,
        cursor: pageParam.cursor,
        excludeIds: pageParam.seenIds,
        limit: 16,
      });
      return {
        posts,
        nextCursor,
        seenIds: [...pageParam.seenIds, ...posts.map((p) => p.id)],
      };
    },
    getNextPageParam: (last) =>
      last.nextCursor && last.posts.length ? { cursor: last.nextCursor, seenIds: last.seenIds } : undefined,
    /** Longer TTL cuts duplicate ranked-merge work when switching tabs; pull-to-refresh still refetches. */
    staleTime: 60_000,
    gcTime: 1000 * 60 * 30,
    /** Matches cold-boot `prefetchInfiniteQuery` in `app/_layout.tsx` — avoids duplicate network on tab mount. */
    refetchOnMount: false,
  });
}

export function usePost(id: string, opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  const enabled =
    opts?.enabled !== undefined ? opts.enabled && !!id : !!id;
  return useQuery({
    queryKey: postKeys.detail(id, viewerId),
    queryFn: () => feedService.getPostById(id, viewerId),
    enabled,
    /** Matches feed TTL; detail screen still refetches via `refetch()` / mutations / invalidation. */
    staleTime: 120_000,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
  });
}

/**
 * Batch-prefetch a list of post ids into the React Query cache as
 * individual `postKeys.detail(id, viewerId)` entries, in a single DB
 * round-trip.
 *
 * Use case: kill the N+1 in `VideoFeedPost`'s attributed-sound lookup.
 * Each cell calls `usePost(soundSourcePostId)` for its attributed sound,
 * which without prefetch fires one query per cell. Calling this hook
 * from the feed screen — once, with every visible cell's sound id —
 * resolves them all in one query and seeds the cache, so each cell's
 * `usePost` call returns instantly from cache.
 *
 * Safe-by-design:
 *   - Only fetches ids that aren't already in the cache (`getQueryData`
 *     check) so we don't refetch sound sources we already have.
 *   - If the batch fails for any reason, individual cells fall back to
 *     their own `usePost` query — no behaviour change, just the speed
 *     win is lost.
 */
export function usePrefetchPostsByIds(
  ids: readonly (string | null | undefined)[],
  enabled: boolean = true,
): void {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  const queryClient = useQueryClient();

  /**
   * Stable, order-independent signature so re-renders that produce the
   * same set of ids don't re-trigger the prefetch.
   */
  const sortedIds = Array.from(
    new Set(ids.filter((x): x is string => !!x && x.trim().length > 0)),
  ).sort();
  const idsKey = sortedIds.join(',');

  useEffect(() => {
    if (!enabled || sortedIds.length === 0) return;

    const missing = sortedIds.filter(
      (id) => queryClient.getQueryData(postKeys.detail(id, viewerId)) === undefined,
    );
    if (missing.length === 0) return;

    let cancelled = false;
    void postsService.getByIds(missing, viewerId).then((map) => {
      if (cancelled) return;
      for (const [id, post] of map.entries()) {
        queryClient.setQueryData(postKeys.detail(id, viewerId), post);
      }
      // Posts that weren't returned (deleted / RLS-filtered) get a
      // `null` cache entry so the per-cell `usePost` won't re-fetch
      // and re-fail. `feedService.getPostById` returns null for these
      // anyway — staying consistent with that contract.
      for (const id of missing) {
        if (!map.has(id)) queryClient.setQueryData(postKeys.detail(id, viewerId), null);
      }
    }).catch(() => {
      // Per-cell `usePost` will retry individually — no need to surface.
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, viewerId, enabled]);
}

export function useLinkedPostsMap(ids: readonly (string | null | undefined)[]): Map<string, Post> {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  const queryClient = useQueryClient();

  const idsKey = useMemo(
    () =>
      Array.from(new Set(ids.filter((x): x is string => !!x && x.trim().length > 0)))
        .sort()
        .join(','),
    [ids],
  );

  const { data: batchMapRaw } = useQuery({
    queryKey: postKeys.linkedBatch(viewerId, idsKey),
    queryFn: async () => {
      const idList = idsKey.length === 0 ? [] : idsKey.split(',');
      return postsService.getByIds(idList, viewerId);
    },
    enabled: idsKey.length > 0,
    staleTime: 30_000,
    gcTime: 1000 * 60 * 15,
    refetchOnMount: false,
  });

  const batchMap = useMemo(() => normalizePostBatchMap(batchMapRaw), [batchMapRaw]);

  useEffect(() => {
    if (batchMap.size === 0 && !batchMapRaw) return;
    if (idsKey.length === 0) return;
    const idList = idsKey.split(',');
    for (const id of idList) {
      const post = batchMap.get(id);
      if (post && linkedPostResolvableForViewer(post, viewerId)) {
        queryClient.setQueryData(postKeys.detail(id, viewerId), post);
      } else {
        queryClient.setQueryData(postKeys.detail(id, viewerId), null);
      }
    }
  }, [batchMap, batchMapRaw, idsKey, queryClient, viewerId]);

  return useMemo(() => {
    const m = new Map<string, Post>();
    if (idsKey.length === 0) return m;
    const idList = idsKey.split(',');
    for (const id of idList) {
      const fromBatch = batchMap.get(id);
      if (fromBatch && linkedPostResolvableForViewer(fromBatch, viewerId)) {
        m.set(id, fromBatch);
        continue;
      }
      const cached = queryClient.getQueryData(postKeys.detail(id, viewerId));
      if (cached != null && typeof cached === 'object' && linkedPostResolvableForViewer(cached as Post, viewerId)) {
        m.set(id, cached as Post);
      }
    }
    return m;
  }, [batchMap, idsKey, queryClient, viewerId]);
}

export function useCommunityPosts(communityId: string) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  const enabled = !!communityId?.trim();
  const q = useInfiniteQuery({
    queryKey: circleContentKeys.communityPosts(communityId, viewerId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      postsService.getByCommunity(communityId, viewerId, {
        limit: COMMUNITY_WALL_PAGE_SIZE,
        cursor: pageParam ?? null,
      }),
    getNextPageParam: (lastPage) => communityWallNextPageParam(lastPage),
    enabled,
    placeholderData: (previousData, previousQuery) => {
      const prevCommunityId = previousQuery?.queryKey[2];
      if (prevCommunityId === communityId) return previousData;
      return undefined;
    },
    staleTime: 45_000,
    gcTime: 1000 * 60 * 20,
    /** Prefetch fills cache before navigation — remount refetch caused stuck `fetching` on first open. */
    refetchOnMount: false,
    retry: 2,
  });

  const allPosts = useMemo(() => flattenCommunityWallPages(q.data), [q.data]);

  const hasWallCache = q.data !== undefined;
  const isWallInitialLoading = enabled && !hasWallCache && !q.isError && (q.isFetching || q.isPending);

  return {
    ...q,
    data: allPosts,
    isWallInitialLoading,
  };
}

/** Viewer’s selected reaction emoji per post in a circle wall (batch over current list). */
export function useCircleViewerPostReactions(communityId: string, postIds: string[]) {
  const { user } = useAuth();
  const sig = useMemo(() => [...postIds].sort().join(','), [postIds]);
  const uid = user?.id ?? '';
  return useQuery({
    queryKey: circleContentKeys.viewerPostReactions(communityId, uid, sig),
    queryFn: () => postsService.getViewerReactionsForPosts(user!.id, postIds),
    enabled: !!user?.id && !!communityId && postIds.length > 0,
    staleTime: 60_000,
    gcTime: 1000 * 60 * 15,
    placeholderData: (previousData) => previousData,
  });
}

export function useUserPosts(userId: string) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  return useQuery({
    queryKey: ['userPosts', userId, viewerId ?? ''],
    queryFn: () => feedService.getUserPosts(userId, viewerId),
    enabled: !!userId,
    /**
     * 15s stale — short enough that "create a post → tap profile" feels
     * fresh (the create flow already invalidates this key via
     * `invalidatePostQueries`), but long enough that bouncing between
     * the same profile and the feed doesn't refetch on every navigation
     * (was `staleTime: 0` + `refetchOnMount: 'always'` — that was a
     * full refetch on every screen mount, which made the profile flash
     * blank for ~300ms when re-visited).
     *
     * Refetch when the gallery/profile screen mounts if stale so feed →
     * "swipe to videos" isn't stuck on an empty persisted-cache snapshot.
     */
    staleTime: 15_000,
    refetchOnMount: true,
  });
}

export function useUserStreak(userId: string | undefined) {
  return useQuery({
    queryKey: ['streak', userId],
    queryFn: () => streaksService.getStreak(userId!),
    enabled: !!userId,
    staleTime: 120_000,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
  });
}

export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: () => communityService.getAll(),
    staleTime: 120_000,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
  });
}

export function useCommunity(slug: string) {
  const key = normalizeCommunitySlug(slug);
  const enabled = key.length > 0;
  const q = useQuery({
    queryKey: ['community', key],
    queryFn: () => communityService.getBySlug(key),
    enabled,
    staleTime: 60_000,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    /**
     * Do **not** keep previous circle data while the slug changes — it leaves
     * `community.id` stale so `useCommunityPosts` keeps querying the wrong wall
     * until focus/refetch (felt like “blank room until I leave and come back”).
     */
  });

  /** True only while the slug query is actively fetching and has no row yet. */
  const isCommunityInitialLoading = enabled && !q.data && q.fetchStatus === 'fetching';

  return { ...q, isCommunityInitialLoading };
}

export function useFeaturedCommunities() {
  return useQuery({
    queryKey: ['communities', 'featured'],
    queryFn: () => communityService.getFeatured(),
    staleTime: 120_000,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
  });
}

export function useCirclesHome() {
  return useQuery({
    queryKey: communityKeys.circlesHome(),
    queryFn: async () => {
      const [featured, trending, newCircles] = await Promise.all([
        circleContentService.getFeaturedCircles(),
        circleContentService.getTrending24h(),
        circleContentService.getNewCircles(),
      ]);
      return { featured, trending, newCircles };
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
  });
}

/**
 * Questions tab threads: loads only after `communityId` is known so we never run a
 * second `getBySlug` inside `listBySlug` in parallel with `useCommunity`.
 */
export function useCircleThreads(slug: string | undefined, communityId: string | undefined) {
  const { user } = useAuth();
  const s = normalizeCommunitySlug(slug ?? '');
  const cid = (communityId ?? '').trim();
  const enabled = !!s && !!cid;
  const q = useInfiniteQuery({
    queryKey: [...circleContentKeys.threadsForRoom(s || '__disabled__', cid || '__pending__'), 'inf'] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      circleContentService.getThreadsByCommunityId(cid, {
        limit: COMMUNITY_THREADS_PAGE_SIZE,
        cursor: pageParam ?? null,
        viewerId: user?.id ?? null,
      }),
    getNextPageParam: (lastPage) => communityThreadsNextPageParam(lastPage),
    enabled,
    staleTime: 45_000,
    gcTime: 1000 * 60 * 15,
    refetchOnMount: false,
    placeholderData: (previousData, previousQuery) => {
      const prevKey = previousQuery?.queryKey;
      const prevCommunityId = prevKey?.[3];
      if (prevCommunityId === cid) return previousData;
      return undefined;
    },
  });

  const allThreads = useMemo(() => flattenCommunityThreadPages(q.data), [q.data]);
  const hasThreadsCache = q.data !== undefined;
  const isThreadsInitialLoading = enabled && !hasThreadsCache && !q.isError && (q.isFetching || q.isPending);

  return {
    ...q,
    data: allThreads,
    isThreadsInitialLoading,
  };
}

export function useCircleThread(threadId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: circleContentKeys.thread(threadId ?? '__disabled__'),
    queryFn: () => circleContentService.getThreadById(threadId!, user?.id ?? null),
    enabled: !!threadId,
    staleTime: 30_000,
    gcTime: 1000 * 60 * 15,
    refetchOnMount: false,
  });
}

export function useCircleThreadReplies(threadId: string | undefined, thread?: CircleThread | null) {
  const { user } = useAuth();
  const q = useInfiniteQuery({
    queryKey: [...circleContentKeys.replies(threadId ?? '__disabled__'), 'inf'] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      circleContentService.getRepliesForThread(threadId!, {
        limit: COMMUNITY_REPLY_PAGE_SIZE,
        cursor: pageParam ?? null,
        viewerId: user?.id ?? null,
        thread: thread ?? undefined,
      }),
    getNextPageParam: (lastPage) => communityRepliesNextPageParam(lastPage),
    enabled: !!threadId,
    staleTime: 30_000,
  });

  const allReplies = useMemo(() => flattenCommunityReplyPages(q.data) ?? [], [q.data]);

  return {
    ...q,
    data: allReplies,
  };
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => userService.getUserById(id),
    enabled: !!id,
    staleTime: 45_000,
    gcTime: 1000 * 60 * 30,
    /** Avoid stale placeholder profiles when opening from feed swipe / search. */
    refetchOnMount: true,
    retry: 2,
  });
}

/** Opt-in: notify viewer when `creatorId` publishes a new live post (see `creator_post_subscribers`). */
export function useCanModerateCircle(communityId: string | undefined) {
  const cid = (communityId ?? '').trim();
  return useQuery({
    queryKey: ['canModerateCircle', cid] as const,
    queryFn: () => circleModerationService.canModerateCircle(cid),
    enabled: !!cid,
    staleTime: 60_000,
  });
}

export function useCircleThreadReaction(threadId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['circleThreadReaction', threadId ?? '', userId ?? ''] as const,
    queryFn: () => circleContentService.getThreadReactionForUser(threadId!, userId ?? null),
    enabled: !!threadId && !!userId,
    staleTime: 15_000,
  });
}

export function useCreatorPostNotifications(
  creatorId: string | undefined,
  viewerId: string | undefined,
) {
  return useQuery({
    queryKey: ['creatorPostNotifications', viewerId ?? '', creatorId ?? ''] as const,
    queryFn: () => profilesService.isSubscribedToCreatorPosts(viewerId!, creatorId!),
    enabled: Boolean(viewerId && creatorId && viewerId !== creatorId),
    staleTime: 60_000,
    gcTime: 1000 * 60 * 15,
    refetchOnMount: false,
  });
}

export function useComments(postId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: commentKeys.byPost(postId, user?.id ?? null),
    queryFn: () => commentService.getByPostId(postId, user?.id),
    enabled: !!postId,
    /**
     * Comments are the highest-touch surface in the app — a 20s stale
     * window plus `refetchOnMount: false` meant a user could tap a
     * "you got a comment" notification, land on the thread, and see
     * the previously-cached empty list (or yesterday's snapshot)
     * with no automatic refresh. Now: every mount triggers a fresh
     * fetch, so the list is always current the moment the screen opens.
     */
    staleTime: 0,
    gcTime: 1000 * 60 * 15,
    refetchOnMount: 'always',
  });
}

const NOTIFICATION_QUERY_STALE_MS = 15_000;

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', user?.id ?? null],
    queryFn: () => notificationService.getAll(user!.id),
    enabled: !!user?.id,
    staleTime: NOTIFICATION_QUERY_STALE_MS,
    refetchInterval: NOTIFICATION_QUERY_STALE_MS,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'unread', user?.id ?? null],
    queryFn: () => notificationService.getUnreadCount(user!.id),
    enabled: !!user?.id,
    staleTime: NOTIFICATION_QUERY_STALE_MS,
    refetchInterval: NOTIFICATION_QUERY_STALE_MS,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
  });
}

export function useProfileUpdates(userId: string | undefined) {
  const { user: authUser } = useAuth();
  const viewerId = authUser?.id ?? null;
  return useQuery({
    /**
     * Key includes the viewer so a logout / user switch invalidates the
     * cached `liked` hydration — two viewers can see totally different
     * heart states for the same profile, and we must not let one user's
     * liked set bleed into another session.
     */
    queryKey: profileUpdateKeys.forUserByViewer(userId!, viewerId),
    queryFn: () => profileUpdatesService.getLatestForUser(userId!, 5, viewerId),
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 1000 * 60 * 15,
    refetchOnMount: false,
  });
}

