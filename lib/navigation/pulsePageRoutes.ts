import type { Router } from 'expo-router';
import { ANONYMOUS_PUBLIC_CREATOR_ID } from '@/lib/postViewerPrivacy';
import { useToast } from '@/components/ui/Toast';

/**
 * Canonical navigation helpers for the Pulse Page / My Pulse Page.
 *
 * Routes (single source of truth):
 *   - Current user's own page : `/(tabs)/my-pulse`
 *   - Another user's page     : `/profile/{userId}`
 *   - @handle resolver        : `/profile/u/{handle}` (redirects to /profile/{id})
 *
 * `/profile/[id]` already self-redirects to `/(tabs)/my-pulse` when the id is
 * the signed-in user, and gates blocked / deleted / private identities. So
 * `openPulsePage` can safely push `/profile/{id}` for ANY real user id and the
 * route handles the "is this me?" + privacy decisions in one place.
 *
 * Privacy guard: anonymous / confession content is redacted at the data layer
 * (`finalizePostsForViewer` rewrites `creatorId` → ANONYMOUS_PUBLIC_CREATOR_ID
 * for non-authors). `openPulsePage` refuses to navigate for that placeholder or
 * any empty id, so an anonymous avatar/name tap is inert instead of opening a
 * dead/leaky profile.
 */

type PushRouter = Pick<Router, 'push' | 'replace'>;

export interface PulsePageNavOptions {
  /** Use `router.replace` instead of `push` (e.g. after a publish/compose flow). */
  replace?: boolean;
  /** Open the Pulse history sheet on arrival (tier-up deep links). */
  openPulseHistory?: boolean;
  /** Highlight the "Share my tier" card (paired with openPulseHistory). */
  tierUp?: boolean;
}

/**
 * True when `userId` points at a real, navigable profile (not anonymous, not
 * empty). Use to decide whether to render a tappable avatar/name at all.
 */
export function isNavigablePulseUserId(userId: string | null | undefined): boolean {
  const id = (userId ?? '').trim();
  if (!id) return false;
  if (id === ANONYMOUS_PUBLIC_CREATOR_ID) return false;
  return true;
}

/** Whether an id is the anonymous/confession placeholder (vs. genuinely missing). */
function isAnonymousPlaceholder(userId: string | null | undefined): boolean {
  return (userId ?? '').trim() === ANONYMOUS_PUBLIC_CREATOR_ID;
}

function buildQuery(opts?: PulsePageNavOptions): string {
  if (!opts) return '';
  const params: string[] = [];
  if (opts.openPulseHistory) params.push('openPulseHistory=1');
  if (opts.tierUp) params.push('tierUp=1');
  return params.length ? `?${params.join('&')}` : '';
}

/**
 * Open another user's public Pulse Page (`/profile/{userId}`). The route
 * self-redirects to `/(tabs)/my-pulse` if `userId` is the signed-in user, so
 * callers never need to branch on "is this me?".
 *
 * @returns `true` if navigation happened, `false` if the id was anonymous /
 *          missing (no-op — safe to call from any tap handler).
 */
export function openPulsePage(
  router: PushRouter,
  userId: string | null | undefined,
  opts?: PulsePageNavOptions,
): boolean {
  if (!isNavigablePulseUserId(userId)) {
    // Tapping an anonymous/confession identity tells the user why nothing
    // opens. Genuinely missing ids stay silent (nothing meaningful to say).
    if (isAnonymousPlaceholder(userId)) {
      useToast.getState().show('Anonymous — no profile', 'info');
    }
    return false;
  }
  const href = `/profile/${encodeURIComponent((userId as string).trim())}${buildQuery(opts)}`;
  if (opts?.replace) {
    router.replace(href as never);
  } else {
    router.push(href as never);
  }
  return true;
}

/** Alias of {@link openPulsePage} with an explicit "other user" name + options. */
export function openUserPulsePage(
  router: PushRouter,
  userId: string | null | undefined,
  opts?: PulsePageNavOptions,
): boolean {
  return openPulsePage(router, userId, opts);
}

/** Open the signed-in user's own My Pulse tab. */
export function openMyPulse(router: PushRouter, opts?: PulsePageNavOptions): void {
  const href = `/(tabs)/my-pulse${buildQuery(opts)}`;
  if (opts?.replace) {
    router.replace(href as never);
  } else {
    router.push(href as never);
  }
}
