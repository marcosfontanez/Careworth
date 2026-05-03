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
