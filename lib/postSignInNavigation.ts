import type { Href } from 'expo-router';
import { resetRootIndexRedirectDedupe } from '@/lib/rootIndexRedirect';
import { sanitizePostSignInNext } from '@/lib/authLoginReturn';

/**
 * Defer navigation after sign-in so Supabase can emit `onAuthStateChange` and
 * `AuthProvider` can set `isAuthenticated` / `isLoading` before routes read them.
 */
export function schedulePostSignInNavigation(
  router: { replace: (href: Href) => void },
  next?: string | null,
): void {
  setTimeout(() => {
    resetRootIndexRedirectDedupe();
    const safeNext = sanitizePostSignInNext(next);
    router.replace((safeNext ?? '/') as Href);
  }, 0);
}
