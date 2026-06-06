import type { EconomyAssumptions, EconomyProfitModel, EconomyWalletTotals, SparkPackIapRow } from "@/lib/admin/economy-math";

export type EconomyDailyPoint = {
  day: string;
  iapValidCount: number;
  giftCount: number;
  sparksGifted: number;
  diamondsEarned: number;
};

export type EconomyTopGiftRow = {
  slug: string;
  name: string;
  sends: number;
  sparksSpent: number;
  diamondsEarned: number;
};

export type EconomyTopEarnerRow = {
  creatorId: string;
  username: string | null;
  displayName: string | null;
  diamondsEarned: number;
  diamondsAvailable: number;
  diamondsPending: number;
  diamondsPaidOut: number;
};

export type EconomyPipelineSnapshot = {
  loaded: boolean;
  rpcAvailable: boolean;
  daysWindow: number;
  error: string | null;
  settings: {
    sparksToDiamondsRatio: { sparks: number; diamonds: number };
    minCashoutDiamonds: number;
    diamondHoldDays: number;
  };
  wallets: EconomyWalletTotals;
  ledger: {
    sparkPurchases: number;
    sparkPurchaseUnits: number;
    promoSparkCredits: number;
    promoSparkUnits: number;
    giftDebits: number;
    giftSparkUnits: number;
    diamondCredits: number;
    diamondCreditUnits: number;
  };
  iap: {
    validReceipts: number;
    refundedReceipts: number;
    pendingReceipts: number;
  };
  gifts: {
    totalSends: number;
    sparksSpent: number;
    diamondsEarned: number;
    liveSends: number;
    postSends: number;
    profileSends: number;
  };
  sparkPackIap: SparkPackIapRow[];
  topGifts: EconomyTopGiftRow[];
  topEarners: EconomyTopEarnerRow[];
  daily: EconomyDailyPoint[];
  defaultAssumptions: EconomyAssumptions;
  profitModel: EconomyProfitModel;
};

export type { EconomyAssumptions, EconomyProfitModel, EconomyWalletTotals, SparkPackIapRow };
