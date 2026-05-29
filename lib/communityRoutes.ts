import type { Href } from 'expo-router';
import { normalizeCommunitySlug } from '@/lib/communitySlug';
import {
  resolvePostViewerRoute,
  type PostViewerRouteInput,
} from '@/lib/postViewerRoute';

/** Typed routes for Circles / community surfaces (avoids `as any` on `router.push`). */
export function hrefTabCircles(scope?: 'yours' | 'discover'): Href {
  if (scope === 'yours') return '/(tabs)/circles?scope=yours';
  if (scope === 'discover') return '/(tabs)/circles?scope=discover';
  return '/(tabs)/circles';
}

export function hrefCommunity(slug: string): Href {
  return `/communities/${normalizeCommunitySlug(slug)}`;
}

export function hrefCommunityThread(slug: string, threadId: string): Href {
  return `/communities/${normalizeCommunitySlug(slug)}/thread/${threadId}`;
}

export function hrefPost(post: PostViewerRouteInput, circleSlug?: string): Href {
  return resolvePostViewerRoute(post, { circle: circleSlug }) as Href;
}

/**
 * Same destination as {@link hrefPost}, plus comment focus — video posts open
 * `/comments/[id]`; non-video opens `/post/[id]?focusComments=1`.
 */
export function hrefPostFocusComments(post: PostViewerRouteInput, circleSlug?: string): Href {
  return resolvePostViewerRoute(post, { circle: circleSlug, focusComments: true }) as Href;
}

/** Opens post detail with the Sparks gift tray (same flow as the post header gift icon). */
export function hrefPostOpenGift(post: PostViewerRouteInput, circleSlug?: string): Href {
  return resolvePostViewerRoute(post, { circle: circleSlug, openGift: true }) as Href;
}

/** Circle wall scrolled to a specific post (e.g. opening a pin from My Pulse). */
export function hrefCommunityWallPost(slug: string, postId: string): Href {
  return `/communities/${normalizeCommunitySlug(slug)}?focusPost=${encodeURIComponent(postId)}`;
}
