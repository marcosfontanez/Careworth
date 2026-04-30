import { describe, expect, it } from "vitest";

import { checkRateLimit } from "@/lib/server/rate-limit";

describe("checkRateLimit", () => {
  it("allows under limit", () => {
    const k = `t-${Math.random()}`;
    expect(checkRateLimit(k, 3, 60_000)).toEqual({ ok: true });
    expect(checkRateLimit(k, 3, 60_000)).toEqual({ ok: true });
    expect(checkRateLimit(k, 3, 60_000)).toEqual({ ok: true });
  });

  it("blocks over limit until window advances", () => {
    const k = `t2-${Math.random()}`;
    checkRateLimit(k, 2, 60_000);
    checkRateLimit(k, 2, 60_000);
    const blocked = checkRateLimit(k, 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
