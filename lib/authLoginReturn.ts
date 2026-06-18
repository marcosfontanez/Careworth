/** Build a safe in-app login href that returns to `nextPath` after sign-in. */
export function buildAuthLoginHref(nextPath: string): string {
  const trimmed = nextPath.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/auth/login';
  }
  return `/auth/login?next=${encodeURIComponent(trimmed)}`;
}

/** Accept only same-app relative paths (no admin login hijack). */
export function sanitizePostSignInNext(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.startsWith('/admin')) return null;
  return trimmed;
}
