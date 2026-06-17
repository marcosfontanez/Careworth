import type { UserProfile } from '@/types';

/** Normalize input for storage (no leading @). Returns null if empty after trim. */
export function sanitizeUsername(raw: string): string | null {
  const s = raw.trim().replace(/^@+/g, '').toLowerCase();
  if (!s) return null;
  if (!isValidUsername(s)) return null;
  return s;
}

/** Instagram-style: 3–30 chars, letters, numbers, underscore, dot; cannot start/end with dot */
export function isValidUsername(s: string): boolean {
  const t = s.trim().toLowerCase();
  if (t.length < 3 || t.length > 30) return false;
  return /^[a-z0-9]([a-z0-9._]*[a-z0-9])?$/.test(t) && !/\.\./.test(t);
}

/** Fallback when `username` is not set — for display only (not guaranteed unique). */
export function fallbackHandle(
  p: Pick<UserProfile, 'id' | 'displayName' | 'firstName' | 'lastName'>,
): string {
  const fl = [p.firstName, p.lastName].filter(Boolean).join('.').toLowerCase();
  const cleaned = fl.replace(/[^a-z0-9.]+/g, '.').replace(/^\.+|\.+$/g, '').replace(/\.{2,}/g, '.');
  if (cleaned.length >= 3) return cleaned.slice(0, 30);

  const fromDisplay = (p.displayName ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');
  if (fromDisplay.length >= 3) return fromDisplay.slice(0, 30);

  const idPart = (p.id ?? '').replace(/[^a-z0-9]/gi, '').slice(0, 10);
  if (idPart.length >= 3) return `user.${idPart}`.slice(0, 30);
  return 'pulseverse.user';
}

/** Always returns a handle with one leading @ for UI (mock: @lexi.rn under name). */
export function profileHandleDisplay(
  p: Pick<UserProfile, 'id' | 'displayName' | 'username' | 'firstName' | 'lastName'>,
): string {
  const stored = p.username?.trim() ? sanitizeUsername(p.username) : null;
  const raw = stored ?? fallbackHandle(p);
  return `@${raw}`;
}

/** Feed card — same rules using creator fields from joined profiles. */
export function profileHandleLineForCreator(c: {
  id: string;
  displayName: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}): string {
  return profileHandleDisplay({
    id: c.id,
    displayName: c.displayName,
    username: c.username,
    firstName: c.firstName ?? '',
    lastName: c.lastName ?? '',
  });
}
