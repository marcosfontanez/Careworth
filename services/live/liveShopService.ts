import type { LiveProduct } from '@/types/liveHub';
import { getDemoProducts } from '@/services/live/mockLiveHubData';

/** Input for a future server-authoritative checkout (Stripe / internal ledger). */
export interface LiveShopCheckoutRequest {
  streamId: string;
  productId: string;
  quantity: number;
  /** Affiliate / sponsored audit trail */
  disclosureType?: 'affiliate' | 'sponsored' | null;
}

/** Resolved checkout hand-off — URL for Safari/Custom Tabs or in-app WebView. */
export interface LiveShopCheckoutResult {
  checkoutUrl: string;
  /** Optional native sheet (Stripe PaymentSheet, etc.) */
  clientSecret?: string;
}

/**
 * Shop Live data + checkout facade. Today returns demo catalog rows; replace internals with
 * Supabase (`shop_live_products`, RPC) without changing screen imports.
 */
export const liveShopService = {
  async getLiveProductsForStream(streamId: string): Promise<LiveProduct[]> {
    return getDemoProducts(streamId);
  },

  /** TODO: RPC `shop_live_create_checkout` — bind stream, seller, inventory snapshot. */
  async requestCheckout(_req: LiveShopCheckoutRequest): Promise<LiveShopCheckoutResult | null> {
    return null;
  },
};
