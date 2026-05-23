import type { LiveStream } from '@/types';

/** Host heartbeat older than this is treated as stale (crash / disconnect). */
export const LIVE_HOST_STALE_MS = 45 * 60 * 1000;

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
  return Date.now() - heartbeatMs <= LIVE_HOST_STALE_MS;
}

export function filterActiveLiveStreams<T extends ActiveStreamFields>(streams: T[]): T[] {
  return streams.filter(isStreamActiveForDiscovery);
}
