import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Shared expand/collapse preference for the Feed action rail.
 *
 * Why a global store (not local component state):
 *  - The rail lives inside each `VideoFeedPost` cell, and FlatList recycles
 *    cells as the user swipes. Local state would reset on every swipe.
 *  - A single shared value means the user's choice (expanded vs collapsed)
 *    persists across video swipes within the session — and across launches
 *    once hydrated from AsyncStorage.
 *  - Only the rail subscribes to it, so toggling never re-renders the video
 *    player.
 */

const KEY_EXPANDED = '@pulseverse_feed_rail_expanded';
const KEY_HINTED = '@pulseverse_feed_rail_hinted';

/** Module-level guard so the many mounted rails only hydrate from disk once. */
let hydrateStarted = false;

interface FeedActionRailState {
  /** Whether the rail is currently expanded. Defaults collapsed (compact). */
  expanded: boolean;
  /** True once the user has expanded at least once — kills the first-time hint glow. */
  hasExpandedOnce: boolean;
  /** Set true after AsyncStorage hydration so we don't flash the wrong state. */
  hydrated: boolean;
  setExpanded: (next: boolean) => void;
  toggle: () => void;
  hydrate: () => Promise<void>;
}

export const useFeedActionRailStore = create<FeedActionRailState>((set, get) => ({
  expanded: false,
  hasExpandedOnce: false,
  hydrated: false,

  setExpanded: (next: boolean) => {
    const prev = get();
    const hasExpandedOnce = prev.hasExpandedOnce || next;
    set({ expanded: next, hasExpandedOnce });
    // Fire-and-forget persistence; failures are non-fatal (in-memory still works).
    void AsyncStorage.setItem(KEY_EXPANDED, next ? '1' : '0').catch(() => {});
    if (hasExpandedOnce && !prev.hasExpandedOnce) {
      void AsyncStorage.setItem(KEY_HINTED, '1').catch(() => {});
    }
  },

  toggle: () => {
    get().setExpanded(!get().expanded);
  },

  hydrate: async () => {
    // Idempotent across the many rail instances that mount in the feed.
    if (hydrateStarted) return;
    hydrateStarted = true;
    try {
      const [expandedRaw, hintedRaw] = await Promise.all([
        AsyncStorage.getItem(KEY_EXPANDED),
        AsyncStorage.getItem(KEY_HINTED),
      ]);
      set({
        // Persisted choice wins; default collapsed when never set.
        expanded: expandedRaw === '1',
        hasExpandedOnce: hintedRaw === '1' || expandedRaw === '1',
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
}));
