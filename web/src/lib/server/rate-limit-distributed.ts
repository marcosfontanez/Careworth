import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { checkRateLimit } from "@/lib/server/rate-limit";

let redisSingleton: Redis | null | undefined;
const ratelimitByConfig = new Map<string, Ratelimit>();

function redisFromEnv(): Redis | null {
  if (redisSingleton !== undefined) return redisSingleton;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisSingleton = null;
    return null;
  }
  redisSingleton = new Redis({ url, token });
  return redisSingleton;
}

function ratelimitInstance(limit: number, windowMs: number): Ratelimit | null {
  const redis = redisFromEnv();
  if (!redis) return null;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const cacheKey = `${limit}@${windowSec}s`;
  let existing = ratelimitByConfig.get(cacheKey);
  if (!existing) {
    existing = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: "pulseverse:rl",
      analytics: false,
    });
    ratelimitByConfig.set(cacheKey, existing);
  }
  return existing;
}

/**
 * Upstash sliding window when `UPSTASH_REDIS_REST_*` is set; otherwise in-memory `checkRateLimit`.
 */
export async function checkRateLimitDistributed(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const rl = ratelimitInstance(limit, windowMs);
  if (rl) {
    const r = await rl.limit(key);
    if (!r.success) {
      const retryAfterSec = Math.max(1, Math.ceil((r.reset - Date.now()) / 1000));
      return { ok: false, retryAfterSec };
    }
    return { ok: true };
  }
  return checkRateLimit(key, limit, windowMs);
}
