import type { Href } from 'expo-router';
import { queryClient } from '@/lib/queryClient';
import { postKeys } from '@/lib/queryKeys';
import { postsService } from '@/services/supabase';
import type { Post } from '@/types';

/** Minimal post shape needed to pick Feed fullscreen vs post detail. */
export type PostViewerRouteInput = Pick<Post, 'id' | 'type' | 'mediaUrl'>;

export type PostViewerRouteOptions = {
  circle?: string | null;
  /** Opens the dedicated comments screen (or post detail composer for non-video). */
  focusComments?: boolean;
  /** Opens the creator gift tray on post detail (non-anonymous posts only). */
  openGift?: boolean;
};

/** True when the post should open in the TikTok-style `/feed/[id]` shell. */
export function isFullscreenVideoPost(post: PostViewerRouteInput): boolean {
  return post.type === 'video' && Boolean(post.mediaUrl?.trim());
}

function appendQuery(base: string, params: string[]): string {
  const parts = params.filter(Boolean);
  if (!parts.length) return base;
  return `${base}?${parts.join('&')}`;
}

/**
 * Resolve the in-app route for opening a post.
 * - Video with media → `/feed/[id]` (fullscreen `VideoFeedPost`)
 * - Text / image / discussion / etc. → `/post/[id]`
 * - `focusComments` → `/comments/[id]` for video, `/post/[id]?focusComments=1` otherwise
 */
export function resolvePostViewerRoute(
  post: PostViewerRouteInput,
  opts?: PostViewerRouteOptions,
): string {
  const circle = opts?.circle?.trim();
  const circleParam = circle ? `circle=${encodeURIComponent(circle)}` : '';
  const giftParam = opts?.openGift ? 'openGift=1' : '';
  const trailing = [circleParam, giftParam].filter(Boolean);

  if (opts?.focusComments) {
    if (isFullscreenVideoPost(post)) {
      return appendQuery(`/comments/${post.id}`, trailing);
    }
    return appendQuery(`/post/${post.id}`, [...trailing, 'focusComments=1']);
  }

  if (isFullscreenVideoPost(post)) {
    return appendQuery(`/feed/${post.id}`, trailing);
  }

  return appendQuery(`/post/${post.id}`, trailing);
}

export function resolvePostViewerHref(
  post: PostViewerRouteInput,
  opts?: PostViewerRouteOptions,
): Href {
  return resolvePostViewerRoute(post, opts) as Href;
}

/**
 * When only a post id is known, hydrate type from React Query cache or a single
 * lightweight fetch before routing.
 */
export async function resolvePostViewerRouteForId(
  postId: string,
  opts?: PostViewerRouteOptions & { viewerId?: string | null },
): Promise<string> {
  const viewerId = opts?.viewerId ?? null;
  const cached = queryClient.getQueryData<Post | null>(postKeys.detail(postId, viewerId));
  if (cached?.id) {
    return resolvePostViewerRoute(cached, opts);
  }

  try {
    const post = await postsService.getById(postId, viewerId);
    if (post) return resolvePostViewerRoute(post, opts);
  } catch {
    /* fall through — unknown posts still land on detail */
  }

  if (opts?.focusComments) {
    return appendQuery(`/post/${postId}`, ['focusComments=1']);
  }
  return `/post/${postId}`;
}

export async function resolvePostViewerHrefForId(
  postId: string,
  opts?: PostViewerRouteOptions & { viewerId?: string | null },
): Promise<Href> {
  return (await resolvePostViewerRouteForId(postId, opts)) as Href;
}

/** Navigate to the correct viewer — resolves type when only an id is known. */
export async function pushPostViewer(
  router: { push: (href: Href) => void },
  postOrId: PostViewerRouteInput | string,
  opts?: PostViewerRouteOptions & { viewerId?: string | null },
): Promise<void> {
  const route =
    typeof postOrId === 'string'
      ? await resolvePostViewerRouteForId(postOrId, opts)
      : resolvePostViewerRoute(postOrId, opts);
  router.push(route as Href);
}
