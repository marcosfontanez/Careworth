import type { ReactNode } from 'react';

/**
 * No-op stub used when Metro aliases `@livekit/react-native` on web.
 * Prevents `registerGlobals()` from loading react-native-webrtc at startup.
 */
export function registerGlobals(): void {}

export const LiveKitRoom = ({ children }: { children?: ReactNode }) => children ?? null;
export function useRoomContext() {
  return null;
}
export function useLocalParticipant() {
  return { localParticipant: null, isMicrophoneEnabled: false, isCameraEnabled: false };
}
export function useTracks() {
  return [];
}
export function useIOSAudioManagement() {}
export function isTrackReference() {
  return false;
}
export const VideoTrack = () => null;
export const AudioSession = {
  configureAudio: async () => {},
  setAppleAudioConfiguration: async () => {},
  startAudioSession: async () => {},
  stopAudioSession: async () => {},
};
export const AndroidAudioTypePresets = {};
