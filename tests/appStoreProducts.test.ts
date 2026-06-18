import { describe, expect, it } from 'vitest';
import {
  APP_STORE_LAUNCH_PRODUCTS,
  APP_STORE_PREFETCH_PRODUCT_IDS,
  IOS_BUNDLE_ID,
} from '@/lib/shop/appStoreProducts';

describe('appStoreProducts', () => {
  it('uses com.pulseverse.app bundle id constant', () => {
    expect(IOS_BUNDLE_ID).toBe('com.pulseverse.app');
  });

  it('prefetch ids match launch catalog and end with .ios', () => {
    expect(APP_STORE_PREFETCH_PRODUCT_IDS).toEqual(
      APP_STORE_LAUNCH_PRODUCTS.map((p) => p.productId),
    );
    for (const id of APP_STORE_PREFETCH_PRODUCT_IDS) {
      expect(id.endsWith('.ios')).toBe(true);
      expect(id.startsWith('com.pulseverse.')).toBe(true);
    }
  });
});
