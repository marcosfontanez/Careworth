import type { Href } from 'expo-router';

/** Typed routes for Circles / community surfaces (avoids `as any` on `router.push`). */
export function hrefTabCircles(scope?: 'yours' | 'discover'): Href {
  if (scope === 'yours') return '/(tabs)/circles?scope=yours';
  if (scope === 'discover') return '/(tabs)/circles?scope=discover';
  return '/(tabs)/circles';
}

export function hrefCommunity(slug: string): Href {
  return `/communities/${slug}`;
}

export function hrefCommunityThread(slug: string, threadId: string): Href {
  return `/communities/${slug}/thread/${threadId}`;
}

export function hrefPost(postId: string, circleSlug?: string): Href {
  if (circleSlug) return `/post/${postId}?circle=${encodeURIComponent(circleSlug)}`;
  return `/post/${postId}`;
}

/**
 * Same destination as {@link hrefPost}, plus `focusComments=1` so the post
 * composer focuses — used when opening a linked clip from My Pulse (card tap
 * or Comment) so users land in the thread immediately.
 */
export function hrefPostFocusComments(postId: string, circleSlug?: string): Href {
  const base = hrefPost(postId, circleSlug);
  const path = typeof base === 'string' ? base : `/post/${postId}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}focusComments=1`;
}

/** Circle wall scrolled to a specific post (e.g. opening a pin from My Pulse). */
export function hrefCommunityWallPost(slug: string, postId: string): Href {
  return `/communities/${slug}?focusPost=${encodeURIComponent(postId)}`;
}
