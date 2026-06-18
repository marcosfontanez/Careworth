import { describe, expect, it } from 'vitest';
import { shopErrorHint, shopPurchaseErrorMessage } from '@/lib/shop/shopErrors';

describe('shopErrors', () => {
  it('maps PURCHASE_IN_PROGRESS to user-facing copy', () => {
    expect(shopErrorHint('PURCHASE_IN_PROGRESS')).toContain('already in progress');
  });

  it('maps IAP_TIMEOUT to restore guidance', () => {
    expect(shopErrorHint('IAP_TIMEOUT')).toMatch(/Restore/i);
  });

  it('prefers server message for STORE_REJECTED', () => {
    const msg = shopPurchaseErrorMessage('STORE_REJECTED', 'Google Play token expired');
    expect(msg).toBe('Google Play token expired');
  });

  it('falls back to hint for USER_CANCELLED', () => {
    expect(shopPurchaseErrorMessage('USER_CANCELLED', '')).toContain('cancelled');
  });
});
