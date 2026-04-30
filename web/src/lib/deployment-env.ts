/**
 * Vercel sets `VERCEL_ENV` to `production` | `preview` | `development`.
 * Use to avoid indexing preview URLs and leaking staging in sitemap/robots.
 */
export function isVercelPreviewDeployment(): boolean {
  return process.env.VERCEL_ENV === "preview";
}
