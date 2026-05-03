import { expoWebAppOrigin } from "./web-app-embed-policy";

/**
 * Enforced only when `NODE_ENV === "production"` (see `next.config.ts`).
 * Keeps dev/HMR unrestricted. Tighten over time (nonces, drop `'unsafe-eval'` when safe).
 *
 * Optional: set `CSP_REPORT_URI` at **build time** (e.g. Vercel env) to a CSP report collector
 * (Sentry Security Policy Reporting, self-hosted endpoint, etc.). Omit in dev/local builds
 * if you do not want violation reports.
 */
export function marketingContentSecurityPolicy(): string {
  const embedOrigin = expoWebAppOrigin();
  const frameSrc = ["'self'", ...(embedOrigin ? [embedOrigin] : [])].join(" ");

  const directives: string[] = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `frame-src ${frameSrc}`,
    // Next.js + React may inline small hydration stubs; Vercel Analytics injects va.vercel-scripts.com
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "object-src 'none'",
    "upgrade-insecure-requests",
    [
      "connect-src",
      "'self'",
      "https://vitals.vercel-insights.com",
      "https://*.vercel-insights.com",
      "wss://*.vercel-insights.com",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.ingest.sentry.io",
      "https://*.ingest.us.sentry.io",
    ].join(" "),
  ];

  const reportUri = process.env.CSP_REPORT_URI?.trim();
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
  }

  return directives.join("; ");
}
