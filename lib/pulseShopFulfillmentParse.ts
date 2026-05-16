/**
 * Parse JSON bodies returned by `pulse-shop-fulfillment` (tests + defensive clients).
 * Kept free of imports from `pulseShopFulfillment.ts` to avoid circular module graphs.
 */

export function parsePulseShopFulfillmentJson(body: unknown):
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: { code: string; message: string; details?: unknown } } {
  if (body === null || typeof body !== 'object' || !('ok' in body)) {
    return {
      ok: false,
      error: {
        code: 'FULFILLMENT_FAILED',
        message: 'Malformed fulfillment payload.',
        details: body,
      },
    };
  }

  const o = body as Record<string, unknown>;
  if (o.ok === true) {
    const data = o.data;
    if (data !== null && typeof data === 'object') {
      return { ok: true, data: data as Record<string, unknown> };
    }
    return { ok: true, data: {} };
  }

  const err = o.error;
  if (err !== null && typeof err === 'object' && 'message' in err) {
    const e = err as { code?: string; message: string; details?: unknown };
    return {
      ok: false,
      error: {
        code: typeof e.code === 'string' ? e.code : 'UNKNOWN',
        message: String(e.message),
        details: e.details,
      },
    };
  }

  return {
    ok: false,
    error: { code: 'FULFILLMENT_FAILED', message: 'Malformed error payload.', details: body },
  };
}
