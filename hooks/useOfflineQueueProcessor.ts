import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { processQueue, createOfflineExecutor } from '@/lib/offlineQueue';
import { queryClient } from '@/lib/queryClient';
import { commentKeys, likedPostKeys, savedPostKeys, userKeys } from '@/lib/queryKeys';

let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo')?.default;
} catch {
  /* NetInfo is optional — on platforms / builds without it we fall back to
     AppState foreground events only. */
}

/**
 * Continuously drains the offline action queue (likes / saves / follows /
 * comments that failed at the time the user performed them) whenever:
 *
 *   1. The user signs in (initial mount with a non-null userId).
 *   2. The app returns to the foreground.
 *   3. The device transitions from offline to online.
 *
 * This is the second half of the offline-resilience contract -- the first half
 * is enqueueing actions on failure in feed.tsx / comments/[postId].tsx. After
 * a successful flush we invalidate the affected query caches so on-screen
 * counters reconcile with what's now on the server.
 */
export function useOfflineQueueProcessor(userId: string | null | undefined) {
  const lastRunAt = useRef(0);

  useEffect(() => {
    if (!userId) return;

    const flush = (reason: string) => {
      /**
       * Coalesce multiple triggers (e.g. AppState 'active' + NetInfo
       * reconnect firing within ~1s of each other) into a single flush
       * to avoid hammering the server with duplicate writes mid-process.
       */
      const now = Date.now();
      if (now - lastRunAt.current < 1500) return;
      lastRunAt.current = now;

      processQueue(createOfflineExecutor())
        .then((result) => {
          if (result.processed > 0) {
            if (__DEV__) console.log(`[offlineQueue] ${reason}: flushed ${result.processed} actions`);
            queryClient.invalidateQueries({ queryKey: likedPostKeys.forUser(userId) });
            queryClient.invalidateQueries({ queryKey: savedPostKeys.forUser(userId) });
            queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
            // Scope to affected posts only when we track them in the
            // queue; until then, this is the one place the "root
            // comments" invalidation is defensible — a flush can
            // replay comments across multiple posts.
            queryClient.invalidateQueries({ queryKey: commentKeys.root() });
          }
        })
        .catch((err) => {
          if (__DEV__) console.warn('[offlineQueue] flush failed:', err);
        });
    };

    flush('mount');

    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') flush('foreground');
    };
    const appSub = AppState.addEventListener('change', onAppStateChange);

    let netUnsub: (() => void) | null = null;
    if (NetInfo?.addEventListener) {
      let wasConnected: boolean | null = null;
      netUnsub = NetInfo.addEventListener((state: { isConnected?: boolean }) => {
        const isConnected = !!state.isConnected;
        /** Only flush on the offline -> online edge, not every NetInfo tick. */
        if (wasConnected === false && isConnected) flush('reconnect');
        wasConnected = isConnected;
      });
    }

    return () => {
      appSub.remove();
      if (netUnsub) netUnsub();
    };
  }, [userId]);
}
