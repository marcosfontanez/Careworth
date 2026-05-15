import * as Linking from 'expo-linking';

/**
 * Normalize user- or server-supplied strings into a browser-safe http(s) URL.
 * Blocks `javascript:`, `data:`, custom schemes, and malformed input.
 */
export function normalizeWebUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Open in the system browser only when the URL is http(s) and valid. */
export function openWebUrlSafely(raw: string): void {
  const href = normalizeWebUrl(raw);
  if (!href) return;
  void Linking.openURL(href).catch(() => undefined);
}
