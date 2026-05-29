import type { LiveKitMintRole } from '@/services/live/liveKitToken';

export type LiveKitJoinDebugContext = {
  streamId: string;
  roomName?: string | null;
  userId?: string | null;
  participantIdentity?: string | null;
  role?: LiveKitMintRole;
  streamStatus?: string | null;
  broadcastStartedAt?: string | null;
  endedAt?: string | null;
  hostLastSeenAt?: string | null;
  tokenExpiresAt?: number | null;
  grants?: {
    roomJoin?: boolean;
    canPublish?: boolean;
    canSubscribe?: boolean;
  };
  phase: string;
  errorMessage?: string;
  errorCode?: string | number | null;
};

/** Dev-only join diagnostics — never log raw JWT tokens. */
export const liveKitJoinDebug = {
  mintAttempt(ctx: Omit<LiveKitJoinDebugContext, 'phase'>) {
    if (!__DEV__) return;
    console.log('[LiveKit join] mint attempt', { ...ctx, phase: 'mint_attempt' });
  },
  mintSuccess(ctx: Omit<LiveKitJoinDebugContext, 'phase'>) {
    if (!__DEV__) return;
    console.log('[LiveKit join] mint success', {
      ...ctx,
      phase: 'mint_success',
      grants: ctx.grants ?? { roomJoin: true, canSubscribe: true, canPublish: ctx.role === 'host' },
    });
  },
  mintFailed(ctx: Omit<LiveKitJoinDebugContext, 'phase'> & { errorMessage: string }) {
    if (!__DEV__) return;
    console.warn('[LiveKit join] mint failed', { ...ctx, phase: 'mint_failed' });
  },
  connectAttempt(ctx: Omit<LiveKitJoinDebugContext, 'phase'>) {
    if (!__DEV__) return;
    console.log('[LiveKit join] connect attempt', { ...ctx, phase: 'connect_attempt' });
  },
  connected(ctx: Omit<LiveKitJoinDebugContext, 'phase'>) {
    if (!__DEV__) return;
    console.log('[LiveKit join] connected', { ...ctx, phase: 'connected' });
  },
  connectionError(ctx: Omit<LiveKitJoinDebugContext, 'phase'> & { errorMessage: string }) {
    if (!__DEV__) return;
    console.warn('[LiveKit join] connection error', { ...ctx, phase: 'connection_error' });
  },
  broadcastMarked(ctx: { streamId: string; ok: boolean }) {
    if (!__DEV__) return;
    console.log('[LiveKit join] broadcast_started_at', ctx);
  },
};
