/**
 * Optional shared cookie options for @supabase/ssr browser + server clients.
 * Set `NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN=.your-domain.com` (leading dot) in production
 * when session cookies must be visible on both apex and app subdomains.
 */
export function supabaseSsrCookieOptions():
  | { domain: string; path: string; sameSite: "lax"; maxAge: number; secure?: boolean }
  | undefined {
  const domain = process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN?.trim();
  if (!domain) return undefined;
  return {
    domain,
    path: "/",
    sameSite: "lax",
    maxAge: 400 * 24 * 60 * 60,
    ...(process.env.NODE_ENV === "production" ? { secure: true } : {}),
  };
}
