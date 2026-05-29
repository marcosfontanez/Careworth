import { useCallback, useEffect, useRef, useState } from 'react';

import { friendlyLiveKitMintError } from '@/lib/live/liveKitJoinErrors';
import { liveKitJoinDebug } from '@/lib/live/liveKitJoinDebug';
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
  streamStatus?: string | null;
  broadcastStartedAt?: string | null;
  endedAt?: string | null;
  hostLastSeenAt?: string | null;
  livekitRoomName?: string | null;
  onJoined?: () => void;
  onRefreshFailed?: (message: string) => void;
}

export interface UseLiveKitSessionResult {
  token: string | null;
  serverUrl: string | null;
  roomName: string | null;
  participantIdentity: string | null;
  error: string | null;
  /** Bump when token is re-minted so LiveKitRoom reconnects with the new JWT. */
  sessionKey: number;
  expiresAt: number | null;
  /** Force a fresh token mint (e.g. on screen focus). */
  remint: () => void;
}

export function useLiveKitSession({
  streamId,
  enabled,
  isHost,
  userId,
  streamStatus,
  broadcastStartedAt,
  endedAt,
  hostLastSeenAt,
  livekitRoomName,
  onJoined,
  onRefreshFailed,
}: UseLiveKitSessionInput): UseLiveKitSessionResult {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [participantIdentity, setParticipantIdentity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remintNonce, setRemintNonce] = useState(0);

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

    if (!isHost && !userId?.trim()) {
      setToken(null);
      setServerUrl(null);
      setRoomName(null);
      setParticipantIdentity(null);
      setError('Sign in to watch live video.');
      return;
    }

    if (endedAt || streamStatus === 'ended') {
      setToken(null);
      setServerUrl(null);
      setError('This live has ended.');
      return;
    }

    if (!isHost && !livekitRoomName?.trim()) {
      setToken(null);
      setServerUrl(null);
      setError('This live is unavailable right now.');
      return;
    }

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
      setRoomName(session.roomName);
      setParticipantIdentity(session.participantIdentity ?? null);
      setError(null);
      setExpiresAt(session.expiresAt);
      setSessionKey((k) => k + 1);
      scheduleRefresh(session.expiresAt);

      liveKitJoinDebug.mintSuccess({
        streamId,
        roomName: session.roomName,
        userId: userId ?? null,
        participantIdentity: session.participantIdentity ?? null,
        role: isHost ? 'host' : 'viewer',
        tokenExpiresAt: session.expiresAt,
        streamStatus: streamStatus ?? null,
        broadcastStartedAt: broadcastStartedAt ?? null,
        endedAt: endedAt ?? null,
        hostLastSeenAt: hostLastSeenAt ?? null,
      });

      if (!isHost && !joinedRef.current) {
        joinedRef.current = true;
        onJoined?.();
      }
    } catch (e: unknown) {
      if (generation !== generationRef.current) return;
      const raw = e instanceof Error ? e.message : 'Live unavailable';
      const msg = friendlyLiveKitMintError(raw);
      setToken(null);
      setServerUrl(null);
      setRoomName(null);
      setParticipantIdentity(null);
      setExpiresAt(null);
      setError(msg);
      clearRefreshTimer();
      liveKitJoinDebug.mintFailed({
        streamId,
        userId: userId ?? null,
        streamStatus: streamStatus ?? null,
        broadcastStartedAt: broadcastStartedAt ?? null,
        endedAt: endedAt ?? null,
        hostLastSeenAt: hostLastSeenAt ?? null,
        errorMessage: raw,
      });
      if (isRefresh) onRefreshFailed?.(msg);
    } finally {
      mintingRef.current = false;
    }
  };

  const remint = useCallback(() => {
    generationRef.current += 1;
    clearRefreshTimer();
    setRemintNonce((n) => n + 1);
  }, [clearRefreshTimer]);

  useEffect(() => {
    joinedRef.current = false;
    clearRefreshTimer();
    generationRef.current += 1;

    if (!enabled || !streamId) {
      setToken(null);
      setServerUrl(null);
      setRoomName(null);
      setParticipantIdentity(null);
      setError(null);
      setExpiresAt(null);
      return;
    }

    void mintRef.current(false);

    return () => {
      generationRef.current += 1;
      clearRefreshTimer();
    };
  }, [
    enabled,
    streamId,
    isHost,
    userId,
    streamStatus,
    broadcastStartedAt,
    endedAt,
    hostLastSeenAt,
    livekitRoomName,
    remintNonce,
    clearRefreshTimer,
  ]);

  return { token, serverUrl, roomName, participantIdentity, error, sessionKey, expiresAt, remint };
}
