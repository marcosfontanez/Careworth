import { AppState } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';
import { communityKeys, feedKeys } from '@/lib/queryKeys';

/** Only refetch after this much background time — avoids churn on quick app switches. */
const MIN_BACKGROUND_FOR_STALE_REFRESH_MS = 25_000;
const FOREGROUND_INVALIDATE_DEBOUNCE_MS = 450;

/** After this idle length, run {@link attachAppResumeStaleDataRefresh} `onLongIdleResume` (reload / hard reset) instead of light invalidation. */
const DEFAULT_LONG_IDLE_RELOAD_MS = 10 * 60 * 1000;

/**
 * When the app was backgrounded long enough, gently invalidate social/discover
 * queries so notifications, live cards, and Circles home reopen **warm** without
 * the user pulling to refresh. Pairs with `persistQueryCache` + `flush` on
 * `onBackground` from the same `AppState` subscription.
 *
 * Optional **long idle** (`onLongIdleResume`): after ~10 minutes background, callers
 * typically reload the JS bundle (`expo-updates`) or reset the feed route so video
 * surfaces and navigation recover from OS suspend (black / stuck UI).
 */
export function attachAppResumeStaleDataRefresh(
  queryClient: QueryClient,
  opts: {
    onBackground?: () => void;
    /** Default 10 minutes. If `onLongIdleResume` is set and background time ≥ this, only long-idle runs (not the light invalidation). */
    longIdleThresholdMs?: number;
    onLongIdleResume?: () => void;
  } = {},
): () => void {
  let backgroundedAt: number | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const longThreshold = opts.longIdleThresholdMs ?? DEFAULT_LONG_IDLE_RELOAD_MS;

  const sub = AppState.addEventListener('change', (next) => {
    if (next === 'background' || next === 'inactive') {
      backgroundedAt = Date.now();
      opts.onBackground?.();
      return;
    }
    if (next !== 'active') return;

    const t0 = backgroundedAt;
    backgroundedAt = null;
    if (t0 == null) return;
    const away = Date.now() - t0;
    if (away < MIN_BACKGROUND_FOR_STALE_REFRESH_MS) return;

    if (debounceTimer != null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (away >= longThreshold && opts.onLongIdleResume) {
        opts.onLongIdleResume();
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
      void queryClient.invalidateQueries({ queryKey: feedKeys.infiniteRoot() });
      void queryClient.invalidateQueries({ queryKey: ['streams', 'live'] });
      void queryClient.invalidateQueries({ queryKey: communityKeys.circlesHome() });
    }, FOREGROUND_INVALIDATE_DEBOUNCE_MS);
  });

  return () => {
    sub.remove();
    if (debounceTimer != null) clearTimeout(debounceTimer);
  };
}
