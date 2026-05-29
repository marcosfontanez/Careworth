import type { QueryClient } from '@tanstack/react-query';
import type { Router } from 'expo-router';
import type { Community, Post, CircleThread } from '@/types';
import { circleContentKeys } from '@/lib/queryKeys';
import { normalizeCommunitySlug } from '@/lib/communitySlug';
import {
  hrefCommunity,
  hrefCommunityThread,
  hrefCommunityWallPost,
} from '@/lib/communityRoutes';
import {
  COMMUNITY_WALL_PAGE_SIZE,
  communityWallNextPageParam,
} from '@/lib/communityWallPostsCache';
import { COMMUNITY_THREADS_PAGE_SIZE, communityThreadsNextPageParam } from '@/lib/communityThreadsCache';
import { postsService, communitiesService } from '@/services/supabase';
import { circleContentService } from '@/services/circleContent';
import { circleRoomDiag } from '@/lib/circleRoomDiag';

/** Cap prefetch wait so navigation never blocks on slow networks. Room nudges recover after. */
const PREFETCH_NAV_TIMEOUT_MS = 2_500;

async function prefetchWithNavTimeout(work: Promise<void>): Promise<void> {
  await Promise.race([
    work,
    new Promise<void>((resolve) => {
      setTimeout(resolve, PREFETCH_NAV_TIMEOUT_MS);
    }),
  ]);
}

/** Matches `useCommunity` in `hooks/useQueries.ts` — seed before `router.push` when the row is already in hand. */
export function primeCommunityDetailCache(
  queryClient: QueryClient,
  community: Community,
  expectedSlug?: string,
) {
  const key = normalizeCommunitySlug(community.slug ?? '');
  if (!key || !community.id) return;
  const expected = expectedSlug ? normalizeCommunitySlug(expectedSlug) : key;
  if (expected !== key) {
    circleRoomDiag('primeCommunityDetailCache:skipSlugMismatch', { expected, key, id: community.id });
    return;
  }
  queryClient.setQueryData(['community', key], community);
}

/** Recover RQ v5 `pending` + `fetchStatus: 'idle'` for the circle wall infinite query. */
export function ensureCommunityWallQuery(
  queryClient: QueryClient,
  communityId: string,
  viewerId: string | null,
): void {
  const id = communityId.trim();
  if (!id) return;
  const key = circleContentKeys.communityPosts(id, viewerId);
  const state = queryClient.getQueryState(key);
  if (state?.status === 'success' || state?.status === 'error') return;
  if (state?.fetchStatus === 'fetching') return;

  circleRoomDiag('ensureCommunityWallQuery', {
    communityId: id,
    status: state?.status,
    fetchStatus: state?.fetchStatus,
  });

  void queryClient.fetchInfiniteQuery({
    queryKey: key,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      postsService.getByCommunity(id, viewerId, {
        limit: COMMUNITY_WALL_PAGE_SIZE,
        cursor: pageParam ?? null,
      }),
    getNextPageParam: (lastPage: Post[]) => communityWallNextPageParam(lastPage),
    staleTime: 45_000,
  });
}

/** Same idle recovery for Questions threads in the room. */
export function ensureCircleThreadsQuery(
  queryClient: QueryClient,
  slug: string,
  communityId: string,
  viewerId?: string | null,
): void {
  const s = normalizeCommunitySlug(slug);
  const id = communityId.trim();
  if (!s || !id) return;
  const key = [...circleContentKeys.threadsForRoom(s, id), 'inf'] as const;
  const state = queryClient.getQueryState(key);
  if (state?.status === 'success' || state?.status === 'error') return;
  if (state?.fetchStatus === 'fetching') return;

  void queryClient.fetchInfiniteQuery({
    queryKey: [...circleContentKeys.threadsForRoom(s, id), 'inf'] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      circleContentService.getThreadsByCommunityId(id, {
        limit: COMMUNITY_THREADS_PAGE_SIZE,
        cursor: pageParam ?? null,
        viewerId: viewerId ?? null,
      }),
    getNextPageParam: (lastPage: CircleThread[]) => communityThreadsNextPageParam(lastPage),
    staleTime: 45_000,
  });
}

/**
 * Warm circle wall + Questions threads before navigation so the room mounts
 * with cache already settled (avoids first-open refetch races).
 */
export async function prefetchCircleRoom(
  queryClient: QueryClient,
  community: Community,
  viewerId: string | null,
): Promise<void> {
  const slug = normalizeCommunitySlug(community.slug ?? '');
  circleRoomDiag('prefetchCircleRoom:start', { slug, id: community.id, viewerId: viewerId ?? null });
  primeCommunityDetailCache(queryClient, community, slug);
  const id = community.id;
  if (!id || !slug) return;

  try {
    await Promise.all([
      queryClient.prefetchInfiniteQuery({
        queryKey: circleContentKeys.communityPosts(id, viewerId),
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) =>
          postsService.getByCommunity(id, viewerId, {
            limit: COMMUNITY_WALL_PAGE_SIZE,
            cursor: pageParam ?? null,
          }),
        getNextPageParam: (lastPage) => communityWallNextPageParam(lastPage),
        pages: 1,
        staleTime: 45_000,
      }),
      queryClient.prefetchInfiniteQuery({
        queryKey: [...circleContentKeys.threadsForRoom(slug, id), 'inf'] as const,
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) =>
          circleContentService.getThreadsByCommunityId(id, {
            limit: COMMUNITY_THREADS_PAGE_SIZE,
            cursor: pageParam ?? null,
            viewerId,
          }),
        getNextPageParam: (lastPage: CircleThread[]) => communityThreadsNextPageParam(lastPage),
        pages: 1,
        staleTime: 45_000,
      }),
    ]);
    circleRoomDiag('prefetchCircleRoom:ok', { slug, id });
  } catch (e) {
    circleRoomDiag('prefetchCircleRoom:fail', {
      slug,
      id,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Cold paths (deep link, My Pulse): one getBySlug then same warm pattern as tap prefetch.
 */
export async function prefetchCircleRoomBySlug(
  queryClient: QueryClient,
  rawSlug: string,
  viewerId: string | null,
): Promise<void> {
  const slug = normalizeCommunitySlug(rawSlug);
  if (!slug) return;
  const row = await communitiesService.getBySlug(slug);
  if (row) await prefetchCircleRoom(queryClient, row, viewerId);
}

export type CircleRoomNavOpts = {
  focusPost?: string;
  source?: string;
};

/**
 * Bounded prefetch, then navigate to the circle room (canonical href + slug normalize).
 */
export async function navigateToCircleRoom(
  router: Router,
  queryClient: QueryClient,
  target: Community | { slug: string },
  viewerId: string | null,
  opts?: CircleRoomNavOpts,
): Promise<void> {
  const slug =
    'id' in target && target.id
      ? normalizeCommunitySlug(target.slug)
      : normalizeCommunitySlug(target.slug);
  if (!slug) return;

  circleRoomDiag('navigateToCircleRoom', { slug, source: opts?.source ?? null });

  if ('id' in target && target.id) {
    await prefetchWithNavTimeout(prefetchCircleRoom(queryClient, target, viewerId));
  } else {
    await prefetchWithNavTimeout(prefetchCircleRoomBySlug(queryClient, slug, viewerId));
  }

  const href = opts?.focusPost?.trim()
    ? hrefCommunityWallPost(slug, opts.focusPost.trim())
    : hrefCommunity(slug);
  router.push(href);
}

/** Thread detail — warm parent room cache, then open canonical thread route. */
export async function navigateToCircleThread(
  router: Router,
  queryClient: QueryClient,
  rawSlug: string,
  threadId: string,
  viewerId: string | null,
  source?: string,
): Promise<void> {
  const slug = normalizeCommunitySlug(rawSlug);
  const tid = threadId.trim();
  if (!slug || !tid) return;

  circleRoomDiag('navigateToCircleThread', { slug, threadId: tid, source: source ?? null });
  await prefetchWithNavTimeout(prefetchCircleRoomBySlug(queryClient, slug, viewerId));
  router.push(hrefCommunityThread(slug, tid));
}

/** Circle wall focused on one post (My Pulse wall pins, etc.). */
export async function navigateToCircleWallPost(
  router: Router,
  queryClient: QueryClient,
  rawSlug: string,
  postId: string,
  viewerId: string | null,
  source?: string,
): Promise<void> {
  const slug = normalizeCommunitySlug(rawSlug);
  const pid = postId.trim();
  if (!slug || !pid) return;

  circleRoomDiag('navigateToCircleWallPost', { slug, postId: pid, source: source ?? null });
  await prefetchWithNavTimeout(prefetchCircleRoomBySlug(queryClient, slug, viewerId));
  router.push(hrefCommunityWallPost(slug, pid));
}
