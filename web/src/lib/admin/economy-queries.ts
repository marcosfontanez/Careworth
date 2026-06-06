import "server-only";

import {
  computeEconomyProfitModel,
  parseDisplayPriceUsdCents,
  type EconomyAssumptions,
} from "@/lib/admin/economy-math";
import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  EconomyDailyPoint,
  EconomyPipelineSnapshot,
  EconomyTopEarnerRow,
  EconomyTopGiftRow,
} from "@/types/admin-economy";
import type { EconomyWalletTotals, SparkPackIapRow } from "@/lib/admin/economy-math";

export type {
  EconomyAssumptions,
  EconomyDailyPoint,
  EconomyPipelineSnapshot,
  EconomyTopEarnerRow,
  EconomyTopGiftRow,
  EconomyWalletTotals,
  SparkPackIapRow,
} from "@/types/admin-economy";
export type { EconomyProfitModel } from "@/lib/admin/economy-math";

const EMPTY_WALLETS: EconomyWalletTotals = {
  sparkPaidBalanceTotal: 0,
  sparkPromoBalanceTotal: 0,
  sparkTotalPurchased: 0,
  sparkTotalSpent: 0,
  diamondPendingTotal: 0,
  diamondAvailableTotal: 0,
  diamondPaidOutTotal: 0,
  diamondTotalEarned: 0,
};

const DEFAULT_ASSUMPTIONS: EconomyAssumptions = {
  storeFeePercent: 30,
  diamondUsdRate: 0.01,
  payoutProcessorPercent: 2.9,
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function ratioFromSettings(raw: unknown): { sparks: number; diamonds: number } {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    sparks: Math.max(num(o.sparks) || 100, 1),
    diamonds: Math.max(num(o.diamonds) || 45, 0),
  };
}

function emptySnapshot(error: string | null, rpcAvailable: boolean): EconomyPipelineSnapshot {
  const ratio = { sparks: 100, diamonds: 45 };
  const profitModel = computeEconomyProfitModel({
    wallets: EMPTY_WALLETS,
    sparkPackIap: [],
    ledgerSparkPurchaseUnits: 0,
    ledgerGiftSparkUnits: 0,
    sparksToDiamondsRatio: ratio,
    assumptions: DEFAULT_ASSUMPTIONS,
  });
  return {
    loaded: false,
    rpcAvailable,
    daysWindow: 90,
    error,
    settings: { sparksToDiamondsRatio: ratio, minCashoutDiamonds: 1000, diamondHoldDays: 0 },
    wallets: EMPTY_WALLETS,
    ledger: {
      sparkPurchases: 0,
      sparkPurchaseUnits: 0,
      promoSparkCredits: 0,
      promoSparkUnits: 0,
      giftDebits: 0,
      giftSparkUnits: 0,
      diamondCredits: 0,
      diamondCreditUnits: 0,
    },
    iap: { validReceipts: 0, refundedReceipts: 0, pendingReceipts: 0 },
    gifts: {
      totalSends: 0,
      sparksSpent: 0,
      diamondsEarned: 0,
      liveSends: 0,
      postSends: 0,
      profileSends: 0,
    },
    sparkPackIap: [],
    topGifts: [],
    topEarners: [],
    daily: [],
    defaultAssumptions: DEFAULT_ASSUMPTIONS,
    profitModel,
  };
}

type RpcPayload = Record<string, unknown>;

export async function loadEconomyPipelineSnapshot(days = 90): Promise<EconomyPipelineSnapshot> {
  if (!isSupabaseConfigured()) {
    return emptySnapshot("Supabase is not configured for this environment.", false);
  }

  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase.rpc("admin_economy_pipeline_summary", { p_days: days });

    if (error) {
      const missingRpc =
        error.message.includes("admin_economy_pipeline_summary") ||
        error.message.includes("Could not find the function") ||
        error.code === "PGRST202";
      return emptySnapshot(
        missingRpc
          ? "Economy summary RPC is not deployed yet. Apply migration 257_admin_economy_pipeline_summary.sql in Supabase."
          : error.message,
        !missingRpc,
      );
    }

    const payload = (data ?? {}) as RpcPayload;
    const settingsRaw = (payload.settings ?? {}) as Record<string, unknown>;
    const sparksToDiamondsRatio = ratioFromSettings(settingsRaw.sparks_to_diamonds_ratio);
    const minCashoutRaw = settingsRaw.min_cashout_threshold as Record<string, unknown> | undefined;
    const holdRaw = settingsRaw.diamond_hold_days as Record<string, unknown> | undefined;

    const walletsRaw = (payload.wallets ?? {}) as Record<string, unknown>;
    const wallets: EconomyWalletTotals = {
      sparkPaidBalanceTotal: num(walletsRaw.spark_paid_balance_total),
      sparkPromoBalanceTotal: num(walletsRaw.spark_promo_balance_total),
      sparkTotalPurchased: num(walletsRaw.spark_total_purchased),
      sparkTotalSpent: num(walletsRaw.spark_total_spent),
      diamondPendingTotal: num(walletsRaw.diamond_pending_total),
      diamondAvailableTotal: num(walletsRaw.diamond_available_total),
      diamondPaidOutTotal: num(walletsRaw.diamond_paid_out_total),
      diamondTotalEarned: num(walletsRaw.diamond_total_earned),
    };

    const ledgerRaw = (payload.ledger ?? {}) as Record<string, unknown>;
    const ledger = {
      sparkPurchases: num(ledgerRaw.spark_purchases),
      sparkPurchaseUnits: num(ledgerRaw.spark_purchase_units),
      promoSparkCredits: num(ledgerRaw.promo_spark_credits),
      promoSparkUnits: num(ledgerRaw.promo_spark_units),
      giftDebits: num(ledgerRaw.gift_debits),
      giftSparkUnits: num(ledgerRaw.gift_spark_units),
      diamondCredits: num(ledgerRaw.diamond_credits),
      diamondCreditUnits: num(ledgerRaw.diamond_credit_units),
    };

    const iapRaw = (payload.iap ?? {}) as Record<string, unknown>;
    const giftsRaw = (payload.gifts ?? {}) as Record<string, unknown>;

    const sparkPackIap: SparkPackIapRow[] = (Array.isArray(payload.spark_pack_iap) ? payload.spark_pack_iap : []).map(
      (row) => {
        const r = row as Record<string, unknown>;
        return {
          shopItemId: String(r.shop_item_id ?? ""),
          slug: String(r.slug ?? ""),
          name: String(r.name ?? ""),
          sparkAmount: num(r.spark_amount),
          priceUsdCents: parseDisplayPriceUsdCents(String(r.real_money_display_price ?? "")),
          validReceiptCount: num(r.valid_receipt_count),
          refundedReceiptCount: num(r.refunded_receipt_count),
        };
      },
    );

    const topGifts: EconomyTopGiftRow[] = (Array.isArray(payload.top_gifts) ? payload.top_gifts : []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        slug: String(r.slug ?? ""),
        name: String(r.name ?? ""),
        sends: num(r.sends),
        sparksSpent: num(r.sparks_spent),
        diamondsEarned: num(r.diamonds_earned),
      };
    });

    const topEarners: EconomyTopEarnerRow[] = (Array.isArray(payload.top_earners) ? payload.top_earners : []).map(
      (row) => {
        const r = row as Record<string, unknown>;
        return {
          creatorId: String(r.creator_id ?? ""),
          username: (r.username as string | null) ?? null,
          displayName: (r.display_name as string | null) ?? null,
          diamondsEarned: num(r.diamonds_earned),
          diamondsAvailable: num(r.diamonds_available),
          diamondsPending: num(r.diamonds_pending),
          diamondsPaidOut: num(r.diamonds_paid_out),
        };
      },
    );

    const daily: EconomyDailyPoint[] = (Array.isArray(payload.daily) ? payload.daily : []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        day: String(r.day ?? ""),
        iapValidCount: num(r.iap_valid_count),
        giftCount: num(r.gift_count),
        sparksGifted: num(r.sparks_gifted),
        diamondsEarned: num(r.diamonds_earned),
      };
    });

    const profitModel = computeEconomyProfitModel({
      wallets,
      sparkPackIap,
      ledgerSparkPurchaseUnits: ledger.sparkPurchaseUnits,
      ledgerGiftSparkUnits: ledger.giftSparkUnits,
      sparksToDiamondsRatio,
      assumptions: DEFAULT_ASSUMPTIONS,
    });

    return {
      loaded: true,
      rpcAvailable: true,
      daysWindow: num(payload.days_window) || days,
      error: null,
      settings: {
        sparksToDiamondsRatio,
        minCashoutDiamonds: num(minCashoutRaw?.diamonds) || 1000,
        diamondHoldDays: num(holdRaw?.days),
      },
      wallets,
      ledger,
      iap: {
        validReceipts: num(iapRaw.valid_receipts),
        refundedReceipts: num(iapRaw.refunded_receipts),
        pendingReceipts: num(iapRaw.pending_receipts),
      },
      gifts: {
        totalSends: num(giftsRaw.total_sends),
        sparksSpent: num(giftsRaw.sparks_spent),
        diamondsEarned: num(giftsRaw.diamonds_earned),
        liveSends: num(giftsRaw.live_sends),
        postSends: num(giftsRaw.post_sends),
        profileSends: num(giftsRaw.profile_sends),
      },
      sparkPackIap,
      topGifts,
      topEarners,
      daily,
      defaultAssumptions: DEFAULT_ASSUMPTIONS,
      profitModel,
    };
  } catch (e) {
    console.error("loadEconomyPipelineSnapshot:", e);
    return emptySnapshot(e instanceof Error ? e.message : "Failed to load economy snapshot.", false);
  }
}
