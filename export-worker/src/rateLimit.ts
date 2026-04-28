const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = Number(process.env.EXPORT_RATE_LIMIT_PER_HOUR ?? 20);

type Window = { count: number; windowStart: number };
const byUser = new Map<string, Window>();

export function checkExportRateLimit(userId: string): void {
  const now = Date.now();
  let w = byUser.get(userId);
  if (!w || now - w.windowStart > WINDOW_MS) {
    w = { count: 0, windowStart: now };
    byUser.set(userId, w);
  }
  if (w.count >= MAX_PER_WINDOW) {
    const err = new Error(`Rate limit: max ${MAX_PER_WINDOW} exports per hour`);
    (err as Error & { status: number }).status = 429;
    throw err;
  }
  w.count += 1;
}
