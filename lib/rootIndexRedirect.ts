import type { Href } from 'expo-router';

/**
 * Dedupes repeated `router.replace` from `app/index.tsx` during focus churn.
 *
 * After logout the index route is often **not mounted** (user is on `/auth/login`), so the
 * screen cannot clear this value. A stale `'/(tabs)/feed'` makes the next login skip
 * `router.replace` and leaves the user on the blank index shell forever.
 *
 * **Reset** this dedupe whenever you force navigation to `/auth/login` from outside
 * `app/index` (e.g. session drop while on tabs), and in {@link schedulePostSignInNavigation}.
 */
let lastReplaceTarget: Href | null = null;

export function resetRootIndexRedirectDedupe(): void {
  lastReplaceTarget = null;
}

export function rootIndexRedirectIfNeeded(router: { replace: (href: Href) => void }, next: Href): void {
  if (lastReplaceTarget === next) return;
  lastReplaceTarget = next;
  router.replace(next);
}
