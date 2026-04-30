/**
 * In-memory sliding-window rate limiter for Route Handlers and server actions.
 * Suitable for single-node and moderate traffic; for multi-region production consider Upstash.
 */

type Bucket = { count: number; resetAt: number };

function store(): Map<string, Bucket> {
  const g = globalThis as unknown as { __pvRateLimit?: Map<string, Bucket> };
  if (!g.__pvRateLimit) g.__pvRateLimit = new Map();
  return g.__pvRateLimit;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const map = store();
  const b = map.get(key);
  if (!b || now >= b.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true };
}

export function getClientIpFromHeaders(getHeader: (name: string) => string | null): string {
  const fwd = getHeader("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = getHeader("x-real-ip");
  if (realIp) return realIp.trim().slice(0, 128);
  return "unknown";
}
