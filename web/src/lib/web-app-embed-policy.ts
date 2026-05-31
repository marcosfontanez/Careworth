import { getPublicSiteUrl } from "./site-url";

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

/**
 * Marketing/canonical hosts that serve the Next.js site itself. Pointing the
 * embed at one of these is a misconfiguration: the site sends
 * `frame-ancestors 'none'` + `X-Frame-Options: DENY` (so it refuses to be framed)
 * and it has no `/feed`, `/circles`, … expo-router routes (so they 404).
 */
const MARKETING_HOSTS = new Set(["pulseverse.app", "www.pulseverse.app"]);

function siteHost(): string | null {
  try {
    return new URL(getPublicSiteUrl()).host;
  } catch {
    return null;
  }
}

/**
 * The Expo web export origin, but only when it is actually usable for the web
 * shell — i.e. it is configured, is a valid URL, is NOT the site's own origin
 * (same-origin framing is blocked by our own CSP), and is NOT a known marketing
 * host (which 404s app routes and forbids framing). Returns `null` otherwise.
 */
export function usableExternalAppOrigin(): string | null {
  const origin = expoWebAppOrigin();
  if (!origin) return null;
  try {
    const host = new URL(origin).host;
    if (host === siteHost()) return null;
    if (MARKETING_HOSTS.has(host)) return null;
    return origin;
  } catch {
    return null;
  }
}

/**
 * Whether the embedded PulseVerse Web export can be safely framed inside
 * `/web-app`. We only consider it embeddable when a usable cross-origin export
 * is configured. (Even then the target must allow framing via
 * `frame-ancestors`; we never try to bypass browser CSP.)
 */
export function webAppEmbedAvailable(): boolean {
  return usableExternalAppOrigin() !== null;
}

/**
 * Resolve a safe "Open in app" link for an expo-router path. When a usable
 * external export is configured we deep-link into it (opened in a new tab, which
 * is never frame-blocked). Otherwise we fall back to the download page so the
 * user is never sent to a 404 or a frame-blocked surface.
 */
export function resolveOpenInAppHref(appPath: string, fallbackHref = "/download"): string {
  const origin = usableExternalAppOrigin();
  if (!origin) return fallbackHref;
  const path = appPath.startsWith("/") ? appPath : `/${appPath}`;
  return `${origin}${path}`;
}
