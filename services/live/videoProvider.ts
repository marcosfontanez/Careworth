/**
 * videoProvider — live video abstraction
 * ---------------------------------------
 * Narrow contract the app uses to publish / consume live video, independent
 * of whatever real-time backend (LiveKit, Agora, Mux, 100ms, …) we adopt.
 *
 * The app today runs against `MockVideoProvider`, which returns a ready
 * "session" immediately but doesn't transport frames. All of the social
 * layer (chat, gifts, polls, presence, pins, follows) works off Supabase and
 * is already fully wired — swapping a real provider in only lights up the
 * actual video bytes.
 *
 * When you're ready to go live for real:
 *   1. Pick a vendor (recommended: LiveKit open-source, self-hosted or cloud).
 *   2. Install the RN SDK (`@livekit/react-native` + webrtc) and add the
 *      native config via EAS config plugin.
 *   3. Spin up an edge function that mints tokens (so secrets don't live on
 *      the client). The function should accept `{ streamId, role }` and
 *      return a short-lived JWT.
 *   4. Implement a new provider matching the `VideoProvider` shape below,
 *      and flip the `videoProvider` export at the bottom.
 *
 * The UI layer doesn't need to change — it already calls `getSession()` and
 * displays the returned `playbackUrl` or embeds the provider's native view.
 */

export type VideoRole = 'host' | 'viewer';

export interface VideoSession {
  /** Stream id (matches `live_streams.id`). */
  streamId: string;
  /** Role for this session — used to pick camera vs playback flows. */
  role: VideoRole;
  /** Short-lived token the native SDK uses to connect. */
  token: string;
  /** Playback URL for `expo-video` fallback (HLS / DASH). */
  playbackUrl?: string;
  /** Provider-specific room name. Some vendors use this instead of streamId. */
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
// Returns a no-op session immediately. The app treats "no playbackUrl" as a
// signal to render the thumbnail image as the background (which is what the
// viewer room does today).
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

// ─── LiveKit placeholder ─────────────────────────────────────────────────
// Not functional yet — kept here as a signpost so future integration has a
// clear landing spot. Uncomment & implement when the native SDK is added.
//
// import { Room } from '@livekit/react-native';
// export const LiveKitVideoProvider: VideoProvider = { ... };

// ─── Active provider ─────────────────────────────────────────────────────
// Flip this to the real provider when you're ready to go live with video.
export const videoProvider: VideoProvider = MockVideoProvider;
