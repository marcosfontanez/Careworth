import { useCallback, useEffect, useRef, useState } from 'react';

import { videoProvider } from '@/services/live/videoProvider';

/** Re-mint this many seconds before JWT expiry (must stay below edge TTL). */
export const LIVEKIT_TOKEN_REFRESH_BUFFER_SEC = {
  host: 120,
  viewer: 90,
} as const;

export interface UseLiveKitSessionInput {
  streamId: string;
  enabled: boolean;
  isHost: boolean;
  userId?: string;
  onJoined?: () => void;
  onRefreshFailed?: (message: string) => void;
}

export interface UseLiveKitSessionResult {
  token: string | null;
  serverUrl: string | null;
  error: string | null;
  /** Bump when token is re-minted so LiveKitRoom reconnects with the new JWT. */
  sessionKey: number;
  expiresAt: number | null;
}

export function useLiveKitSession({
  streamId,
  enabled,
  isHost,
  userId,
  onJoined,
  onRefreshFailed,
}: UseLiveKitSessionInput): UseLiveKitSessionResult {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinedRef = useRef(false);
  const mintingRef = useRef(false);
  const generationRef = useRef(0);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(
    (nextExpiresAt: number) => {
      clearRefreshTimer();
      const bufferSec = isHost
        ? LIVEKIT_TOKEN_REFRESH_BUFFER_SEC.host
        : LIVEKIT_TOKEN_REFRESH_BUFFER_SEC.viewer;
      const delayMs = Math.max(
        5_000,
        (nextExpiresAt - bufferSec - Math.floor(Date.now() / 1000)) * 1000,
      );
      refreshTimerRef.current = setTimeout(() => {
        void mintRef.current(true);
      }, delayMs);
    },
    [clearRefreshTimer, isHost],
  );

  const mintRef = useRef<(isRefresh: boolean) => Promise<void>>(async () => {});

  mintRef.current = async (isRefresh: boolean) => {
    if (!enabled || !streamId || mintingRef.current) return;
    const generation = generationRef.current;
    mintingRef.current = true;
    try {
      const session = await videoProvider.getSession({
        streamId,
        role: isHost ? 'host' : 'viewer',
        userId: userId ?? '',
      });
      if (generation !== generationRef.current) return;
      setToken(session.token);
      setServerUrl(session.playbackUrl ?? '');
      setError(null);
      setExpiresAt(session.expiresAt);
      setSessionKey((k) => k + 1);
      scheduleRefresh(session.expiresAt);

      if (!isHost && !joinedRef.current) {
        joinedRef.current = true;
        onJoined?.();
      }
    } catch (e: unknown) {
      if (generation !== generationRef.current) return;
      const msg = e instanceof Error ? e.message : 'Live unavailable';
      setToken(null);
      setServerUrl(null);
      setExpiresAt(null);
      setError(msg);
      clearRefreshTimer();
      if (isRefresh) onRefreshFailed?.(msg);
    } finally {
      mintingRef.current = false;
    }
  };

  useEffect(() => {
    joinedRef.current = false;
    clearRefreshTimer();
    generationRef.current += 1;

    if (!enabled || !streamId) {
      setToken(null);
      setServerUrl(null);
      setError(null);
      setExpiresAt(null);
      return;
    }

    void mintRef.current(false);

    return () => {
      generationRef.current += 1;
      clearRefreshTimer();
    };
  }, [enabled, streamId, isHost, userId, clearRefreshTimer]);

  return { token, serverUrl, error, sessionKey, expiresAt };
}
