import { useEffect, useState } from 'react';

import type { LiveStream } from '@/types';

/**
 * Client discovery: hide streams ~2 min after last host heartbeat.
 * Host pings every ~30s while broadcasting — 2 min allows brief network blips.
 */
export const LIVE_DISCOVERY_STALE_MS = 2 * 60 * 1000;

/** @deprecated Use {@link LIVE_DISCOVERY_STALE_MS}. Kept for imports that referenced the old name. */
export const LIVE_HOST_STALE_MS = LIVE_DISCOVERY_STALE_MS;

/** Server viewer join preflight (migration 200) — intentionally more lenient than discovery UI. */
export const LIVE_SERVER_JOIN_STALE_MS = 45 * 60 * 1000;

type ActiveStreamFields = Pick<
  LiveStream,
  'status' | 'endedAt' | 'broadcastStartedAt' | 'hostLastSeenAt' | 'startedAt'
>;

function parseMs(iso?: string | null): number | null {
  if (!iso?.trim()) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** True when a row should appear in Happening Now / live discovery. */
export function isStreamActiveForDiscovery(stream: ActiveStreamFields): boolean {
  if (stream.status !== 'live') return false;
  if (stream.endedAt) return false;
  if (!stream.broadcastStartedAt) return false;

  const heartbeatMs =
    parseMs(stream.hostLastSeenAt) ??
    parseMs(stream.broadcastStartedAt) ??
    parseMs(stream.startedAt);

  if (heartbeatMs == null) return false;
  return Date.now() - heartbeatMs <= LIVE_DISCOVERY_STALE_MS;
}

export function filterActiveLiveStreams<T extends ActiveStreamFields>(streams: T[]): T[] {
  return streams.filter(isStreamActiveForDiscovery);
}

/** Alias for feed / Live tab parity — same rules as {@link isStreamActiveForDiscovery}. */
export const isLiveStreamActive = isStreamActiveForDiscovery;

/** Re-run time-based discovery filters between network refetches. */
export function useLiveDiscoveryStaleTick(intervalMs = 30_000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(iv);
  }, [intervalMs]);
  return tick;
}
