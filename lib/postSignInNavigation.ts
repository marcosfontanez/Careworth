import type { Href } from 'expo-router';
import { resetRootIndexRedirectDedupe } from '@/lib/rootIndexRedirect';

/**
 * Defer `replace('/')` to the next macrotask so Supabase can emit `onAuthStateChange` and
 * `AuthProvider` can set `isAuthenticated` / `isLoading` before `app/index` reads them.
 * Without this, the index route often runs once with stale unauthenticated state and skips
 * the feed redirect until cold start.
 */
export function schedulePostSignInNavigation(router: { replace: (href: Href) => void }): void {
  setTimeout(() => {
    /** Fresh sign-in must not inherit a stale `lastReplaceTarget` from a session that ended on tabs. */
    resetRootIndexRedirectDedupe();
    router.replace('/');
  }, 0);
}
