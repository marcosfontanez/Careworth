import { useEffect } from 'react';
import { useQueries, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  feedService,
  communityService,
  jobService,
  userService,
  commentService,
  notificationService,
  profileUpdatesService,
  circleContentService,
} from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { streaksService } from '@/services/social/streaks';
import { streamsService } from '@/services/streams';
import type { FeedType } from '@/types';
import { postsService } from '@/services/supabase';
import {
  commentKeys,
  likedPostKeys,
  postKeys,
  profileUpdateKeys,
  savedPostKeys,
  userKeys,
} from '@/lib/queryKeys';

/** Bump when feed queryFn shape changes so dev clients don’t keep a stale Fast Refresh closure. */
const FEED_QUERY_KEY_VERSION = 2;

export function useFeed(type: FeedType, userId?: string) {
  return useQuery({
    queryKey: ['feed', FEED_QUERY_KEY_VERSION, type, userId ?? null],
    queryFn: () => feedService.getFeed(type, userId),
    /** Avoid re-running ranked merge on every tab focus/mount; pull-to-refresh still refetches. */
    staleTime: 30_000,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: true,
  });
}

export function useLikedPostIds(userId?: string) {
  return useQuery({
    queryKey: likedPostKeys.forUser(userId),
    queryFn: async () => [...(await postsService.getLikedPostIdsForUser(userId!))],
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 1000 * 60 * 30,
  });
}

const FEED_INFINITE_VER = 1;

/** Paged feed: first page uses full ranked/chronological merge; later pages chronological tail. */
export function useFeedInfinite(type: FeedType, userId?: string) {
  return useInfiniteQuery({
    queryKey: ['feedInf', FEED_INFINITE_VER, type, userId ?? null],
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
    staleTime: 30_000,
    gcTime: 1000 * 60 * 30,
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
  });
}

/**
 * Parallel fetch a list of posts by ID, sharing the cache with `usePost` so
 * that any post already seen in the feed / detail screen is reused for free.
 *
 * Used by My Pulse to resolve `linkedPostId`s on Clip pins (which can
 * reference another creator's post, so they aren't always in `userPosts`).
 * Returns a stable Map keyed by post id — callers should treat a missing
 * entry as "not yet resolved" rather than "doesn't exist" and fall back to
 * whatever snapshot data lives on the pin itself.
 */
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
  ids: ReadonlyArray<string | null | undefined>,
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

export function useLinkedPostsMap(
  ids: ReadonlyArray<string | null | undefined>,
): Map<string, import('@/types').Post> {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;

  const uniqueIds = Array.from(
    new Set(ids.filter((x): x is string => !!x && x.trim().length > 0)),
  );

  const results = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: postKeys.detail(id, viewerId),
      queryFn: () => feedService.getPostById(id, viewerId),
      enabled: !!id,
      /** Linked-post previews are an enhancement, not critical — keep them
       *  fresh enough to reflect like/comment bumps on refresh, but avoid
       *  hammering the DB if someone pins 10+ clips. */
      staleTime: 30_000,
      gcTime: 1000 * 60 * 15,
    })),
  });

  const map = new Map<string, import('@/types').Post>();
  uniqueIds.forEach((id, i) => {
    const p = results[i]?.data;
    if (p) map.set(id, p);
  });
  return map;
}

export function useCommunityPosts(communityId: string) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  return useQuery({
    queryKey: ['communityPosts', communityId, viewerId ?? ''],
    queryFn: () => feedService.getCommunityPosts(communityId, viewerId),
    enabled: !!communityId,
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
     */
    staleTime: 15_000,
  });
}

export function useUserStreak(userId: string | undefined) {
  return useQuery({
    queryKey: ['streak', userId],
    queryFn: () => streaksService.getStreak(userId!),
    enabled: !!userId,
  });
}

export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: () => communityService.getAll(),
  });
}

export function useCommunity(slug: string) {
  return useQuery({
    queryKey: ['community', slug],
    queryFn: () => communityService.getBySlug(slug),
    enabled: !!slug,
  });
}

export function useFeaturedCommunities() {
  return useQuery({
    queryKey: ['communities', 'featured'],
    queryFn: () => communityService.getFeatured(),
  });
}

export function useCirclesHome() {
  return useQuery({
    queryKey: ['circles', 'home', 3],
    queryFn: async () => ({
      featured: await circleContentService.getFeaturedCircles(),
      trending: await circleContentService.getTrending24h(),
      newCircles: await circleContentService.getNewCircles(),
    }),
  });
}

export function useCircleThreads(slug: string | undefined) {
  return useQuery({
    queryKey: ['circleThreads', slug],
    queryFn: () => circleContentService.getThreadsByCircleSlug(slug!),
    enabled: !!slug,
  });
}

export function useCircleThread(threadId: string | undefined) {
  return useQuery({
    queryKey: ['circleThread', threadId],
    queryFn: () => circleContentService.getThreadById(threadId!),
    enabled: !!threadId,
  });
}

export function useCircleThreadReplies(threadId: string | undefined) {
  return useQuery({
    queryKey: ['circleReplies', threadId],
    queryFn: () => circleContentService.getRepliesForThread(threadId!),
    enabled: !!threadId,
  });
}

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobService.getAll(),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => jobService.getById(id),
    enabled: !!id,
  });
}

export function useFeaturedJobs() {
  return useQuery({
    queryKey: ['jobs', 'featured'],
    queryFn: () => jobService.getFeatured(),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.getUserById(id),
    enabled: !!id,
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: commentKeys.byPost(postId),
    queryFn: () => commentService.getByPostId(postId),
    enabled: !!postId,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll(),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationService.getUnreadCount(),
  });
}

export function useLiveStreams() {
  return useQuery({
    queryKey: ['streams', 'live'],
    queryFn: () => streamsService.getAllStreams(),
    /**
     * Live stream presence doesn't need second-by-second freshness — a
     * 90s cadence is "live enough" for a discover-tab card and cuts
     * background traffic from idle viewers ~3× vs the old 30s polling
     * (was hammering the streams table every 30s on every focused
     * Discover tab session).
     */
    refetchInterval: 90_000,
    refetchIntervalInBackground: false,
  });
}

export function useStream(id: string) {
  return useQuery({
    queryKey: ['stream', id],
    queryFn: () => streamsService.getStreamById(id),
    enabled: !!id,
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
  });
}

