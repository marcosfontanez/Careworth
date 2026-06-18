import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' as const },
}));

import {
  isConcurrentPurchaseBlocked,
  purchaseProcessKey,
  shouldTreatFulfillmentAsGranted,
  storeProductMatchesCatalogSku,
} from '@/lib/shop/iapPurchaseGuards';

describe('purchaseProcessKey', () => {
  it('prefers transactionId over productId', () => {
    expect(
      purchaseProcessKey({
        productId: 'com.pulseverse.sparks.100.ios',
        transactionId: 'tx-1',
        purchaseToken: 'tok',
      }),
    ).toBe('tx-1');
  });

  it('falls back to purchaseToken then productId', () => {
    expect(purchaseProcessKey({ productId: 'sku', purchaseToken: 'tok' })).toBe('tok');
    expect(purchaseProcessKey({ productId: 'sku' })).toBe('sku');
  });
});

describe('storeProductMatchesCatalogSku', () => {
  it('matches exact iOS sku', () => {
    expect(
      storeProductMatchesCatalogSku(
        'com.pulseverse.sparks.500.ios',
        'com.pulseverse.sparks.500.ios',
      ),
    ).toBe(true);
  });

  it('rejects mismatched iOS sku', () => {
    expect(
      storeProductMatchesCatalogSku('com.pulseverse.sparks.100.ios', 'com.pulseverse.sparks.500.ios'),
    ).toBe(false);
  });
});

describe('isConcurrentPurchaseBlocked', () => {
  it('blocks when an unsettled slot exists', () => {
    expect(isConcurrentPurchaseBlocked({ settled: false })).toBe(true);
    expect(isConcurrentPurchaseBlocked({ settled: true })).toBe(false);
    expect(isConcurrentPurchaseBlocked(null)).toBe(false);
  });
});

describe('shouldTreatFulfillmentAsGranted', () => {
  it('treats DUPLICATE_PURCHASE as granted', () => {
    expect(shouldTreatFulfillmentAsGranted('DUPLICATE_PURCHASE', 'already done')).toBe(true);
  });

  it('treats duplicate wording as granted', () => {
    expect(shouldTreatFulfillmentAsGranted('FULFILLMENT_FAILED', 'Order already fulfilled')).toBe(true);
  });

  it('does not treat store rejection as granted', () => {
    expect(shouldTreatFulfillmentAsGranted('STORE_REJECTED', 'Invalid receipt')).toBe(false);
  });
});
