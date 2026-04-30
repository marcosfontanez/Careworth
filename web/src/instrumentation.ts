/**
 * Next.js instrumentation hook — runs once on server start.
 * Optional: set SENTRY_DSN and run `npx @sentry/wizard@latest -i nextjs` to wire full tracing.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  try {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.12 : 1,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    });
  } catch {
    // Sentry not installed — safe to ignore
  }
}
