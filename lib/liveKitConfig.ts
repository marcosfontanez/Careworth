import { shouldBootstrapLiveKitNative } from '@/lib/expoRuntime';

/** Shared LiveKit env check — used by video provider and feature flags. */
export function liveKitConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_LIVEKIT_URL?.trim();
  return Boolean(url && url.startsWith('wss://'));
}

/** True for release/store builds (not Metro dev). */
export function isProductionReleaseBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && !__DEV__;
}

/** True when this binary can connect to LiveKit (native build + wss URL baked in). */
export function isLiveKitVideoReady(): boolean {
  return shouldBootstrapLiveKitNative() && liveKitConfigured();
}
