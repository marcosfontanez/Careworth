import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { queryClient } from '@/lib/queryClient';
import { prefetchCircleRoomBySlug } from '@/lib/communityCache';

function firstQueryString(
  qp: Linking.QueryParams | null | undefined,
  key: string,
): string | undefined {
  if (!qp) return undefined;
  const v = qp[key];
  if (typeof v === 'string' && v.trim()) return v;
  if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim()) return v[0];
  return undefined;
}

function pathWithoutQuery(path: string): string {
  return path.split('?')[0] ?? '';
}

/** Strip leading `/` and any query/hash from the first path segment only (path is already path-only from `parsed.path`). */
function normalizePathKey(path: string): string {
  return pathWithoutQuery(path.replace(/^\/+/, ''));
}

/**
 * Remove `prefix` from the start of `path` (case-insensitive). `prefix` should not start with `/`.
 * Returns the remainder without a leading slash, or null if `path` does not start with `prefix`.
 */
function stripPrefixCaseInsensitive(path: string, prefix: string): string | null {
  const p = normalizePathKey(path);
  if (p.length < prefix.length) return null;
  const head = p.slice(0, prefix.length);
  if (head.toLowerCase() !== prefix.toLowerCase()) return null;
  return p.slice(prefix.length).replace(/^\/+/, '');
}

function safeDecodeURIComponent(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Shared links use `/post/:id` on the web (OG + Universal Links). In-app we open
 * `feed/[id]` so viewers land on the same full-screen `VideoFeedPost` shell as
 * the main feed — not the compact `post/[id]` detail + comments layout.
 */
function pushFeedForSharedPost(postId: string, parsed: Linking.ParsedURL) {
  const circle = firstQueryString(parsed.queryParams, 'circle');
  const q = circle ? `?circle=${encodeURIComponent(circle)}` : '';
  router.push(`/feed/${postId}${q}` as any);
}

export function parseAndNavigate(url: string) {
  try {
    const parsed = Linking.parse(url);
    const path = normalizePathKey(parsed.path ?? '');

    // e.g. pulseverse:/// with no path — do not navigate (avoids Unmatched Route noise).
    if (!path) return false;

    /** `https://pulseverse.app/communities/:slug/thread/:id` (see shareCircleThread) */
    const communitiesRest = stripPrefixCaseInsensitive(path, 'communities/');
    if (communitiesRest !== null) {
      const segments = communitiesRest.split('/').filter(Boolean);
      if (segments.length >= 3 && segments[1].toLowerCase() === 'thread' && segments[2]) {
        const slug = safeDecodeURIComponent(segments[0]);
        const threadId = safeDecodeURIComponent(segments[2]);
        prefetchCircleRoomBySlug(queryClient, slug, null);
        router.push(`/communities/${slug}/thread/${threadId}` as any);
        return true;
      }
      if (segments.length === 1 && segments[0]) {
        const s = safeDecodeURIComponent(segments[0]);
        prefetchCircleRoomBySlug(queryClient, s, null);
        router.push(`/communities/${s}` as any);
        return true;
      }
      return false;
    }

    const pLower = path.toLowerCase();
    if (pLower === 'my-pulse' || pLower.startsWith('my-pulse/')) {
      router.push('/(tabs)/my-pulse' as any);
      return true;
    }

    const postRest = stripPrefixCaseInsensitive(path, 'post/');
    if (postRest !== null) {
      const postId = postRest.split('/').filter(Boolean)[0]?.trim() ?? '';
      if (!postId) return false;
      pushFeedForSharedPost(postId, parsed);
      return true;
    }

    /** In-app feed URL or future web path that resolves to the same viewer. */
    const feedRest = stripPrefixCaseInsensitive(path, 'feed/');
    if (feedRest !== null) {
      const postId = feedRest.split('/').filter(Boolean)[0]?.trim() ?? '';
      if (!postId) return false;
      pushFeedForSharedPost(postId, parsed);
      return true;
    }

    const profileRest = stripPrefixCaseInsensitive(path, 'profile/');
    if (profileRest !== null) {
      const userPath = profileRest.split('/').filter(Boolean).join('/');
      if (!userPath) return false;
      router.push(`/profile/${userPath}` as any);
      return true;
    }

    const communityRest = stripPrefixCaseInsensitive(path, 'community/');
    if (communityRest !== null) {
      const slug = communityRest.split('/').filter(Boolean)[0]?.trim() ?? '';
      if (!slug) return false;
      prefetchCircleRoomBySlug(queryClient, slug, null);
      router.push(`/communities/${slug}` as any);
      return true;
    }

    const chatRest = stripPrefixCaseInsensitive(path, 'chat/');
    if (chatRest !== null) {
      const conversationId = chatRest.split('/').filter(Boolean)[0]?.trim() ?? '';
      if (!conversationId) return false;
      router.push(`/messages/${conversationId}` as any);
      return true;
    }
  } catch {}

  return false;
}

export function setupDeepLinkHandler() {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    parseAndNavigate(url);
  });

  Linking.getInitialURL().then((url) => {
    if (url) parseAndNavigate(url);
  });

  return () => subscription.remove();
}
