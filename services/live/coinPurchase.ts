/**
 * coinPurchase — IAP scaffold
 * ---------------------------
 * Defines the interface the app uses to buy coins, plus a mock provider that
 * lets us exercise the full purchase flow without shipping real receipts.
 *
 * When we're ready to ship real payments, install `expo-iap` (or equivalent),
 * implement a new provider that fulfills the `CoinPurchaseProvider` shape,
 * then replace the `activeProvider` export below. No call sites change.
 *
 * Why a provider abstraction:
 *   - keeps IAP surface area tiny (just this file touches Apple/Google APIs)
 *   - makes tests / simulators trivial (use `MockCoinPurchaseProvider`)
 *   - lets us ship the UI flow today and light up payments later without a
 *     second refactor pass.
 */

import { supabase } from '@/lib/supabase';

export interface CoinPack {
  /** Stable SKU used by both stores — keep identical between iOS / Android. */
  sku: string;
  /** Display name ("Starter Pack"). */
  name: string;
  /** Coins credited on successful purchase. */
  coins: number;
  /** Local-currency price for UI display (fetched from store for real provider). */
  priceLabel: string;
  /** Bonus callout ("+15% Bonus") if present. */
  bonus?: string;
  /** Flag the "most popular" pack in the UI. */
  popular?: boolean;
}

export interface PurchaseResult {
  success: boolean;
  sku?: string;
  coinsCredited?: number;
  transactionId?: string;
  error?: string;
}

export interface CoinPurchaseProvider {
  /** Kick off any one-time init (store connection, etc). Idempotent. */
  init(): Promise<void>;

  /** Catalog of packs — provider may override prices from the store. */
  listPacks(): Promise<CoinPack[]>;

  /** Begin a purchase flow and resolve once finished. */
  purchase(sku: string, userId: string): Promise<PurchaseResult>;

  /** Retry un-consumed receipts on cold-start so users never lose coins. */
  restorePending(userId: string): Promise<void>;
}

// ─── Default catalog ─────────────────────────────────────────────────────
// Shared across providers. Prices are placeholders when the store doesn't
// have its own pricing (i.e. the mock provider).
export const DEFAULT_COIN_PACKS: CoinPack[] = [
  { sku: 'coins_starter',   name: 'Starter',   coins: 100,  priceLabel: '$0.99' },
  { sku: 'coins_fan',       name: 'Fan',       coins: 550,  priceLabel: '$4.99', bonus: '+10%' },
  { sku: 'coins_supporter', name: 'Supporter', coins: 1200, priceLabel: '$9.99', bonus: '+20%', popular: true },
  { sku: 'coins_champion',  name: 'Champion',  coins: 3000, priceLabel: '$24.99', bonus: '+25%' },
  { sku: 'coins_legend',    name: 'Legend',    coins: 6500, priceLabel: '$49.99', bonus: '+30%' },
];

// ─── Mock provider ───────────────────────────────────────────────────────
// Used in dev / review builds until native IAP is wired up. Credits coins
// straight to the user's wallet — *not* for production use.
//
// Note: this still goes through Supabase so the balance surfaces in the UI
// via the same code path real purchases will use.
export const MockCoinPurchaseProvider: CoinPurchaseProvider = {
  async init() {
    // no-op
  },

  async listPacks() {
    return DEFAULT_COIN_PACKS;
  },

  async purchase(sku, userId) {
    const pack = DEFAULT_COIN_PACKS.find((p) => p.sku === sku);
    if (!pack) return { success: false, error: 'Unknown pack' };
    if (!userId) return { success: false, error: 'Sign in required' };

    // Simulate store latency.
    await new Promise((r) => setTimeout(r, 600));

    // Credit the mock purchase via a server-side RPC in the real flow; for
    // the mock, we bump the wallet directly. If the RPC doesn't exist (it
    // doesn't in migration 046), we degrade to an optimistic client update.
    const { error } = await supabase.rpc('credit_mock_purchase', {
      sku,
      coins: pack.coins,
    });

    if (error) {
      // RPC not present — fall back to direct update so dev builds still work.
      const { data: current } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      const nextBalance = (current?.balance ?? 0) + pack.coins;
      await supabase
        .from('user_coins')
        .upsert({ user_id: userId, balance: nextBalance }, { onConflict: 'user_id' });
    }

    return {
      success: true,
      sku,
      coinsCredited: pack.coins,
      transactionId: `mock-${Date.now()}`,
    };
  },

  async restorePending() {
    // nothing to restore in mock mode
  },
};

// Swap this when real IAP ships.
export const coinPurchaseProvider: CoinPurchaseProvider = MockCoinPurchaseProvider;

/** Convenience wrapper for the default provider. */
export const coinPurchaseService = {
  init: () => coinPurchaseProvider.init(),
  listPacks: () => coinPurchaseProvider.listPacks(),
  purchase: (sku: string, userId: string) => coinPurchaseProvider.purchase(sku, userId),
  restorePending: (userId: string) => coinPurchaseProvider.restorePending(userId),
};
