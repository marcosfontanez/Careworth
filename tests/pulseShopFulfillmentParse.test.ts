import { describe, expect, it } from 'vitest';
import { parsePulseShopFulfillmentJson } from '@/lib/pulseShopFulfillmentParse';

describe('parsePulseShopFulfillmentJson', () => {
  it('accepts ok:true with object data', () => {
    const out = parsePulseShopFulfillmentJson({
      ok: true,
      data: { purchase_receipt_id: 'r1', already_fulfilled: false },
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.data.purchase_receipt_id).toBe('r1');
    }
  });

  it('accepts ok:false with code + message', () => {
    const out = parsePulseShopFulfillmentJson({
      ok: false,
      error: { code: 'DUPLICATE_PURCHASE', message: 'already done' },
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error.code).toBe('DUPLICATE_PURCHASE');
      expect(out.error.message).toContain('already');
    }
  });

  it('rejects null body', () => {
    const out = parsePulseShopFulfillmentJson(null);
    expect(out.ok).toBe(false);
  });
});
