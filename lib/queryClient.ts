import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager, Platform } from 'react-native';

const CACHE_KEY = 'pulseverse_query_cache';

/**
 * Hard cap on the serialized JSON we'll write to AsyncStorage. Above
 * this, persisting starts to compete with first-paint work on cold
 * boot (parsing the JSON back in `restoreQueryCache` is a synchronous
 * JS-thread operation and a 5MB blob can stall ~80–150ms on a mid-tier
 * Android). 1MB keeps us well under the budget while still preserving
 * profile/notifications/comments caches that benefit from instant
 * restore.
 */
const MAX_PERSISTED_BYTES = 1_000_000;

/**
 * Per-entry size cap. Some queries naturally produce huge payloads
 * (e.g. an exhaustive comment thread, an admin moderation list).
 * Restoring them isn't worth the parse cost — they'll re-fetch
 * cheaply when the user lands on the screen.
 */
const MAX_ENTRY_BYTES = 100_000;

/**
 * Hard cap on the number of entries restored. Even with size limits,
 * iterating thousands of cache entries on cold boot hurts first paint.
 */
const MAX_RESTORED_ENTRIES = 60;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
});

export async function persistQueryCache() {
  try {
    const cache = queryClient.getQueryCache().getAll();
    /**
     * Pre-filter entries that we know we'll never restore so we don't
     * waste AsyncStorage write bandwidth (or quota — Android's
     * AsyncStorage maxes out at ~6MB by default).
     *
     * Sorted by recency so when we trim to fit `MAX_PERSISTED_BYTES`
     * below, we drop the oldest queries first.
     */
    const candidates = cache
      .filter((q) => q.state.status === 'success' && q.state.data)
      .filter((q) => {
        const primaryKey = Array.isArray(q.queryKey) ? q.queryKey[0] : q.queryKey;
        return !SKIP_PERSIST_KEYS.has(primaryKey);
      })
      .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt);

    const serializable: Array<{ queryKey: unknown; data: unknown; dataUpdatedAt: number }> = [];
    let runningBytes = 2; // for the surrounding "[]"
    for (const q of candidates) {
      const entry = {
        queryKey: q.queryKey,
        data: q.state.data,
        dataUpdatedAt: q.state.dataUpdatedAt,
      };
      let entryJson: string;
      try {
        entryJson = JSON.stringify(entry);
      } catch {
        continue; // unserialisable (cycles, functions) — skip silently
      }
      if (entryJson.length > MAX_ENTRY_BYTES) continue;
      if (runningBytes + entryJson.length + 1 > MAX_PERSISTED_BYTES) break;
      serializable.push(entry);
      runningBytes += entryJson.length + 1;
    }

    const json = JSON.stringify(serializable);
    if (Platform.OS === 'web') {
      try { localStorage.setItem(CACHE_KEY, json); } catch {}
    } else {
      await AsyncStorage.setItem(CACHE_KEY, json);
    }
  } catch {}
}

/**
 * Skip both persist and restore for these query "buckets". Either the
 * data is too volatile to be useful from a stale snapshot (feed lists
 * hide new posts until pull-to-refresh — confusing UX) or the next
 * fetch is fast enough that the persistence overhead isn't worth it
 * (notifications poll on focus anyway).
 */
const SKIP_RESTORE_KEYS = new Set([
  'communities',
  'feed',
  'feedInf',
  'streams',
  'notifications',
]);

/**
 * Same set on the persist side — no point writing to disk what we'll
 * skip on read. Keeps the persisted blob small.
 */
const SKIP_PERSIST_KEYS = SKIP_RESTORE_KEYS;

export async function restoreQueryCache(): Promise<void> {
  /**
   * Defer the entire restore until after the first frame has rendered.
   * `InteractionManager.runAfterInteractions` schedules the callback
   * for the next idle frame, which means the AsyncStorage read + JSON
   * parse + `setQueryData` loop never blocks first paint.
   *
   * This trades ~50–150ms of "cache available" latency for a much
   * snappier app launch — the user sees the splash → tab bar → empty
   * cells immediately, then cached data hydrates in. With the
   * pre-fetch in `_layout.tsx` running in parallel, by the time the
   * user can actually interact, the cache is warm anyway.
   */
  return new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(async () => {
      try {
        let json: string | null = null;
        if (Platform.OS === 'web') {
          try { json = localStorage.getItem(CACHE_KEY); } catch {}
        } else {
          json = await AsyncStorage.getItem(CACHE_KEY);
        }

        if (!json) {
          resolve();
          return;
        }

        const entries: Array<{ queryKey: any; data: any; dataUpdatedAt: number }> = JSON.parse(json);
        const maxAge = 1000 * 60 * 60 * 24;
        const now = Date.now();

        let restored = 0;
        for (const entry of entries) {
          if (restored >= MAX_RESTORED_ENTRIES) break;
          const primaryKey = Array.isArray(entry.queryKey) ? entry.queryKey[0] : entry.queryKey;
          if (SKIP_RESTORE_KEYS.has(primaryKey)) continue;
          if (now - entry.dataUpdatedAt >= maxAge) continue;
          queryClient.setQueryData(entry.queryKey, entry.data);
          restored += 1;
        }
      } catch {}
      resolve();
    });
  });
}

export function clearPersistedCache() {
  try {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(CACHE_KEY); } catch {}
    } else {
      AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
    }
  } catch {}
}
