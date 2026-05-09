/**
 * Dev-only timings for the For You feed pipeline.
 *
 * Cold-open the app signed in, open Metro logs (or Safari Web Inspector on iOS),
 * and look for `[feedPerf]` lines. Parallel `lane:*` durations overlap in wall
 * time; the bottleneck for that phase is roughly the slowest lane. Sequential
 * phases stack (e.g. `hydrateRankedPosts` after lanes complete).
 */
export const feedPerfEnabled =
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  typeof performance !== 'undefined' &&
  typeof performance.now === 'function';

export function feedPerfNow(): number {
  return feedPerfEnabled ? performance.now() : 0;
}

export function feedPerfLog(phase: string, t0: number, extra?: string): void {
  if (!feedPerfEnabled) return;
  const ms = performance.now() - t0;
  console.log(`[feedPerf] ${phase} ${ms.toFixed(0)}ms${extra ? ` ${extra}` : ''}`);
}

/** Time one parallel lane inside `Promise.all` (wall time for that async unit). */
export async function feedPerfLane<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = feedPerfNow();
  try {
    return await fn();
  } finally {
    feedPerfLog(`lane:${label}`, t0);
  }
}
