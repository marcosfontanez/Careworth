import { Platform } from 'react-native';

export type FeedListWindowConfig = {
  windowSize: number;
  maxToRenderPerBatch: number;
  initialNumToRender: number;
};

/**
 * Vertical feed pre-mounts neighbor cells so the next video buffers early.
 * Android tends to hit decoder / surface contention sooner than iOS — use a
 * slightly smaller window so scroll stays closer to 60fps on mid-tier devices.
 *
 * When tuning: compare `[feedPerf]` timings (`lib/feedPerf.ts`) on a physical
 * mid-tier Android device before widening these numbers.
 */
export function getFeedVideoListWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 4, maxToRenderPerBatch: 2, initialNumToRender: 2 };
  }
  /** iOS: mount one page first for less work before first paint; neighbors follow in one batch. */
  return { windowSize: 5, maxToRenderPerBatch: 3, initialNumToRender: 1 };
}
