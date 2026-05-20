/**
 * videoProvider — live video abstraction
 * ---------------------------------------
 * Narrow contract the app uses to publish / consume live video, independent
 * of whatever real-time backend (LiveKit, Agora, Mux, 100ms, …) we adopt.
 *
 * Engagement (chat, gifts, polls, pins) stays on Supabase — only media bytes
 * flow through the active provider.
 */

import { isExpoGo } from '@/lib/expoRuntime';
import { mintLiveKitCredentials } from '@/services/live/liveKitToken';

export type VideoRole = 'host' | 'viewer';

export interface VideoSession {
  /** Stream id (matches `live_streams.id`). */
  streamId: string;
  /** Role for this session — used to pick camera vs playback flows. */
  role: VideoRole;
  /** Short-lived token the native SDK uses to connect. */
  token: string;
  /** LiveKit WSS URL — informational; native SDK connects with serverUrl + token. */
  playbackUrl?: string;
  /** Provider-specific room name. */
  roomName: string;
  /** Seconds-since-epoch when the token expires. Re-request a session past this. */
  expiresAt: number;
}

export interface VideoProvider {
  readonly id: 'mock' | 'livekit' | 'agora' | 'mux' | string;

  /** Fetch a session (token + playback URL) for this role. */
  getSession(input: {
    streamId: string;
    role: VideoRole;
    userId: string;
  }): Promise<VideoSession>;

  /**
   * Providers that need cleanup (disconnecting sockets, releasing camera)
   * implement this. Safe no-op on mock.
   */
  endSession(streamId: string): Promise<void>;
}

// ─── Mock provider ───────────────────────────────────────────────────────
export const MockVideoProvider: VideoProvider = {
  id: 'mock',

  async getSession({ streamId, role }) {
    return {
      streamId,
      role,
      token: 'mock-token',
      roomName: `mock-${streamId}`,
      playbackUrl: undefined,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
  },

  async endSession() {
    // no-op
  },
};

// ─── LiveKit (native SDK — dev/EAS builds only; not Expo Go) ──────────────

export const LiveKitVideoProvider: VideoProvider = {
  id: 'livekit',

  async getSession({ streamId }) {
    const cred = await mintLiveKitCredentials(streamId);
    if (!cred) {
      throw new Error('Could not mint LiveKit credentials');
    }
    return {
      streamId: cred.streamId,
      role: cred.role,
      token: cred.token,
      roomName: cred.roomName,
      playbackUrl: cred.serverUrl,
      expiresAt: cred.expiresAt,
    };
  },

  async endSession() {
    // Disconnect is owned by `LiveKitStage` mount lifecycle / navigation teardown.
  },
};

function liveKitConfigured(): boolean {
  if (isExpoGo()) return false;
  const url = process.env.EXPO_PUBLIC_LIVEKIT_URL?.trim();
  return Boolean(url && url.startsWith('wss://'));
}

/**
 * Active provider — LiveKit when `EXPO_PUBLIC_LIVEKIT_URL` is set (dev/EAS),
 * otherwise mock thumbnail-only behaviour for founders without Cloud wired yet.
 */
export const videoProvider: VideoProvider = liveKitConfigured() ? LiveKitVideoProvider : MockVideoProvider;
