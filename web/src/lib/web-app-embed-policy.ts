/**
 * Declares which origins may use camera / microphone inside a cross-origin iframe
 * when PulseVerse Web (Expo export) is embedded from `/web-app`.
 * Evaluated at build time — set `NEXT_PUBLIC_EXPO_WEB_APP_URL` in Vercel/env.
 */
export function webAppEmbedPermissionsPolicy(): string {
  const raw = process.env.NEXT_PUBLIC_EXPO_WEB_APP_URL?.trim();
  const baseline =
    "accelerometer=(), autoplay=(self), clipboard-read=(self), clipboard-write=(self), encrypted-media=(self), geolocation=(), gyroscope=(), payment=(), usb=()";
  if (!raw) {
    return `${baseline}, camera=(), fullscreen=(self), microphone=()`;
  }
  try {
    const origin = new URL(raw).origin;
    return `${baseline}, camera=(self "${origin}"), fullscreen=(self "${origin}"), microphone=(self "${origin}")`;
  } catch {
    return `${baseline}, camera=(), fullscreen=(self), microphone=()`;
  }
}

export function expoWebAppOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_EXPO_WEB_APP_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}
