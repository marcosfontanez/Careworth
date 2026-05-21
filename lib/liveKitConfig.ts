/** Shared LiveKit env check — used by video provider and feature flags. */
export function liveKitConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_LIVEKIT_URL?.trim();
  return Boolean(url && url.startsWith('wss://'));
}

/** True for release/store builds (not Metro dev). */
export function isProductionReleaseBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && !__DEV__;
}
