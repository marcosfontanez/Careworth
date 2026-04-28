/**
 * Central React Query key factory.
 *
 * Why this exists:
 *   Keys were previously stringly-typed literals spread across hooks,
 *   screens, and invalidators — and drifting. We had three variants of
 *   `['savedPosts', …]` across the app, a 2-tuple `['post', id]` in
 *   caption-edit fighting a 3-tuple `['post', id, viewerId]` in
 *   `usePost`, and a second `['postById', id]` key living only in the
 *   My Pulse detail screen. This module is the single source of truth.
 *
 * Rules:
 *   1. ALL keys are declared here — never inline `['foo', id]` in a
 *      component.
 *   2. Keys are *functions*, not arrays. This lets callers pass viewer
 *      ids without remembering the tuple shape, and lets us change the
 *      internal shape later without touching callsites.
 *   3. A `root()` key is provided for invalidations that genuinely want
 *      to nuke every entry for a feature (e.g. "user logged out, drop
 *      every comments cache"). Narrow invalidations should use the full
 *      key so they only hit the affected post.
 *
 * Typing:
 *   All returned keys are `as const` tuples, which gives React Query's
 *   generic inference enough information to keep data and updater fn
 *   types tight without repeating the key at the callsite.
 */

type Nullable<T> = T | null | undefined;

const maybe = (value: Nullable<string>) =>
  typeof value === 'string' && value.length > 0 ? value : '';

// ─────────────────────────────────────────────────────────────────────
// Posts
// ─────────────────────────────────────────────────────────────────────
export const postKeys = {
  /**
   * Invalidate every per-post cache entry regardless of viewer.
   * Use sparingly — prefer `detail(id, viewerId)` for precise hits.
   */
  root: () => ['post'] as const,
  /**
   * Partial key matching every viewer's cache entry for this post id.
   * Use for `invalidateQueries` when you've mutated a field that all
   * viewers should see (caption edit, delete, engagement counters).
   */
  byId: (id: string) => ['post', id] as const,
  /**
   * Exact key including viewer id. Use for `useQuery` / `setQueryData`
   * — viewer-scoped fields (isLiked, isSaved, …) live per-row.
   */
  detail: (id: string, viewerId: Nullable<string>) =>
    ['post', id, maybe(viewerId)] as const,
};

// ─────────────────────────────────────────────────────────────────────
// Comments
// ─────────────────────────────────────────────────────────────────────
export const commentKeys = {
  /**
   * Matches every `['comments', postId]` cache entry. Only useful for
   * global sign-out / cache clears — day-to-day invalidations should
   * scope to a single post.
   */
  root: () => ['comments'] as const,
  /** Comments for a single post. */
  byPost: (postId: string) => ['comments', postId] as const,
};

// ─────────────────────────────────────────────────────────────────────
// Saved posts (per viewer)
// ─────────────────────────────────────────────────────────────────────
export const savedPostKeys = {
  root: () => ['savedPosts'] as const,
  forUser: (userId: Nullable<string>) => ['savedPosts', maybe(userId)] as const,
};

// ─────────────────────────────────────────────────────────────────────
// Liked posts (per viewer)
// ─────────────────────────────────────────────────────────────────────
export const likedPostKeys = {
  root: () => ['likedPosts'] as const,
  forUser: (userId: Nullable<string>) => ['likedPosts', maybe(userId)] as const,
};

// ─────────────────────────────────────────────────────────────────────
// User / profile
// ─────────────────────────────────────────────────────────────────────
export const userKeys = {
  root: () => ['user'] as const,
  detail: (userId: string) => ['user', userId] as const,
};

// ─────────────────────────────────────────────────────────────────────
// Profile updates (My Pulse posts)
// ─────────────────────────────────────────────────────────────────────
export const profileUpdateKeys = {
  root: () => ['profileUpdates'] as const,
  /**
   * Partial key that matches **every** viewer's cache entry for this
   * owner. Use this for `invalidateQueries` so a new pin by the owner
   * refreshes the list for the owner, viewers currently on the page,
   * and any anonymous cache entry — without us having to enumerate
   * viewer ids.
   */
  forUser: (ownerUserId: string) => ['profileUpdates', ownerUserId] as const,
  /**
   * Exact key including viewer id — used by `useQuery`/`setQueryData`
   * because a viewer's `hasLiked`/etc. state lives per-row.
   */
  forUserByViewer: (ownerUserId: string, viewerId: Nullable<string>) =>
    ['profileUpdates', ownerUserId, maybe(viewerId)] as const,

  /**
   * Single My Pulse update detail. Partial matcher — matches both the
   * 2-tuple (anonymous) and 3-tuple (per-viewer) cache entries for
   * invalidation.
   */
  byId: (id: string) => ['profileUpdate', id] as const,
  /** Exact detail key including viewer for reads / setQueryData. */
  detailForViewer: (id: string, viewerId: Nullable<string>) =>
    ['profileUpdate', id, maybe(viewerId)] as const,
  /** Comments for a single My Pulse update. */
  comments: (id: string) => ['profileUpdateComments', id] as const,
};

// ─────────────────────────────────────────────────────────────────────
// Pulse score (v2 engine)
// ─────────────────────────────────────────────────────────────────────
export const pulseScoreKeys = {
  current: (userId: Nullable<string>) => ['pulseScoreCurrent', maybe(userId)] as const,
  history: (userId: Nullable<string>) => ['pulseHistory', maybe(userId)] as const,
  leaderboardCurrent: (scope: string) => ['pulseLeaderboardCurrent', scope] as const,
  leaderboardLifetime: (scope: string) => ['pulseLeaderboardLifetime', scope] as const,
};

// ─────────────────────────────────────────────────────────────────────
// Communities / Circles
// ─────────────────────────────────────────────────────────────────────
export const communityKeys = {
  /** Partial key: invalidates every viewer's `useCommunityPosts` cache for this room. */
  postsAllViewers: (communityId: string) => ['communityPosts', communityId] as const,
  detailBySlug: (slug: string) => ['community', slug] as const,
  listAll: () => ['communities'] as const,
  circlesHome: () => ['circles', 'home'] as const,
};

// ─────────────────────────────────────────────────────────────────────
// Feed
// ─────────────────────────────────────────────────────────────────────
export const feedKeys = {
  /** Matches every legacy non-infinite feed page key `['feed', ver, …]`. */
  root: () => ['feed'] as const,
  /** Matches every infinite-feed page key `['feedInf', ver, type, viewer]`. */
  infiniteRoot: () => ['feedInf'] as const,
  /** Infinite feed page. React Query tracks pages internally; this is
   *  the base key used by `useInfiniteQuery`. */
  infinite: (viewerId: Nullable<string>) => ['feed', 'infinite', maybe(viewerId)] as const,
};
