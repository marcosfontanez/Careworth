import type { LiveKitMintRole } from '@/services/live/liveKitToken';

/** Dev-only LiveKit audio diagnostics — stripped in production builds. */
export const liveKitAudioDebug = {
  roomConnected(role: LiveKitMintRole) {
    if (__DEV__) console.log('[LiveKit audio] Room connected', { role });
  },
  localAudioPublished(trackSid?: string) {
    if (__DEV__) console.log('[LiveKit audio] Local audio track published', { trackSid });
  },
  remoteAudioSubscribed(participantIdentity: string, trackSid?: string) {
    if (__DEV__) {
      console.log('[LiveKit audio] Remote audio track subscribed', {
        participantIdentity,
        trackSid,
      });
    }
  },
  trackMuted(kind: string, muted: boolean, source?: string) {
    if (__DEV__) console.log('[LiveKit audio] Track muted state', { kind, muted, source });
  },
  permissionDenied(kind: 'microphone' | 'camera') {
    if (__DEV__) console.warn('[LiveKit audio] Permission denied', { kind });
  },
  startAudioInvoked() {
    if (__DEV__) console.log('[LiveKit audio] room.startAudio() invoked');
  },
  startAudioFailed(err: unknown) {
    if (__DEV__) console.warn('[LiveKit audio] room.startAudio() failed', err);
  },
  attachRemoteFailed(err: unknown) {
    if (__DEV__) console.warn('[LiveKit audio] Remote audio attach failed', err);
  },
  noHostAudioTrack() {
    if (__DEV__) console.warn('[LiveKit audio] Host connected but no local audio track is published');
  },
  mediaDeviceFailure(kind?: MediaDeviceKind, failure?: string) {
    if (__DEV__) console.warn('[LiveKit audio] Media device failure', { kind, failure });
  },
};
