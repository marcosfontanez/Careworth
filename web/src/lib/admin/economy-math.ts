/** Parse catalog display prices like "$4.99" → cents (499). */
export function parseDisplayPriceUsdCents(display: string | null | undefined): number {
  if (!display?.trim()) return 0;
  const n = Number.parseFloat(display.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export function formatUsd(cents: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(cents / 100);
}

export type EconomyAssumptions = {
  /** Apple / Google IAP fee (e.g. 30 or 15). */
  storeFeePercent: number;
  /** USD paid per Diamond at cash-out (not set in DB yet — planning knob). */
  diamondUsdRate: number;
  /** Optional Stripe Connect fee on payouts. */
  payoutProcessorPercent: number;
};

export type SparkPackIapRow = {
  shopItemId: string;
  slug: string;
  name: string;
  sparkAmount: number;
  priceUsdCents: number;
  validReceiptCount: number;
  refundedReceiptCount: number;
};

export type EconomyWalletTotals = {
  sparkPaidBalanceTotal: number;
  sparkPromoBalanceTotal: number;
  sparkTotalPurchased: number;
  sparkTotalSpent: number;
  diamondPendingTotal: number;
  diamondAvailableTotal: number;
  diamondPaidOutTotal: number;
  diamondTotalEarned: number;
};

export type EconomyProfitModel = {
  grossIapUsdCents: number;
  netIapUsdCents: number;
  storeFeeUsdCents: number;
  diamondLiabilityUsdCents: number;
  diamondPaidOutUsdCents: number;
  unspentPaidSparkFloatUsdCents: number;
  estimatedNetProfitUsdCents: number;
  estimatedMarginPercent: number;
  breakEvenDiamondUsdRate: number;
  avgPaidSparkUsdCents: number;
  giftUtilizationPercent: number;
  sparksToDiamondsRatio: { sparks: number; diamonds: number };
  platformSparkSharePercent: number;
};

export function computeSparkPackGrossUsdCents(packs: SparkPackIapRow[]): number {
  return packs.reduce((sum, p) => sum + p.priceUsdCents * p.validReceiptCount, 0);
}

export function computeEconomyProfitModel(input: {
  wallets: EconomyWalletTotals;
  sparkPackIap: SparkPackIapRow[];
  ledgerSparkPurchaseUnits: number;
  ledgerGiftSparkUnits: number;
  sparksToDiamondsRatio: { sparks: number; diamonds: number };
  assumptions: EconomyAssumptions;
}): EconomyProfitModel {
  const { wallets, sparkPackIap, ledgerSparkPurchaseUnits, ledgerGiftSparkUnits, sparksToDiamondsRatio, assumptions } =
    input;

  const grossIapUsdCents = computeSparkPackGrossUsdCents(sparkPackIap);
  const storeFeeUsdCents = Math.round(grossIapUsdCents * (assumptions.storeFeePercent / 100));
  const netIapUsdCents = grossIapUsdCents - storeFeeUsdCents;

  const diamondLiabilityDiamonds = wallets.diamondAvailableTotal + wallets.diamondPendingTotal;
  const diamondLiabilityUsdCents = Math.round(diamondLiabilityDiamonds * assumptions.diamondUsdRate * 100);
  const diamondPaidOutUsdCents = Math.round(wallets.diamondPaidOutTotal * assumptions.diamondUsdRate * 100);

  const avgPaidSparkUsdCents =
    ledgerSparkPurchaseUnits > 0
      ? Math.round(grossIapUsdCents / ledgerSparkPurchaseUnits)
      : sparkPackIap.find((p) => p.sparkAmount === 500)?.priceUsdCents != null
        ? Math.round((sparkPackIap.find((p) => p.sparkAmount === 500)!.priceUsdCents / 500) * 100) / 100
        : 99;

  const unspentPaidSparkFloatUsdCents = Math.round(wallets.sparkPaidBalanceTotal * avgPaidSparkUsdCents);

  const payoutFeeUsdCents = Math.round(diamondPaidOutUsdCents * (assumptions.payoutProcessorPercent / 100));

  const estimatedNetProfitUsdCents =
    netIapUsdCents - diamondLiabilityUsdCents - diamondPaidOutUsdCents - payoutFeeUsdCents;

  const estimatedMarginPercent =
    grossIapUsdCents > 0 ? (estimatedNetProfitUsdCents / grossIapUsdCents) * 100 : 0;

  const diamondUnitsPerSpark =
    sparksToDiamondsRatio.sparks > 0 ? sparksToDiamondsRatio.diamonds / sparksToDiamondsRatio.sparks : 0.45;

  const breakEvenDiamondUsdRate =
    ledgerGiftSparkUnits > 0 && netIapUsdCents > 0
      ? netIapUsdCents / 100 / (ledgerGiftSparkUnits * diamondUnitsPerSpark)
      : avgPaidSparkUsdCents > 0
        ? (avgPaidSparkUsdCents / 100) * (sparksToDiamondsRatio.sparks / Math.max(sparksToDiamondsRatio.diamonds, 1))
        : 0.0155;

  const giftUtilizationPercent =
    wallets.sparkTotalPurchased > 0 ? (ledgerGiftSparkUnits / wallets.sparkTotalPurchased) * 100 : 0;

  const platformSparkSharePercent =
    sparksToDiamondsRatio.sparks > 0
      ? ((sparksToDiamondsRatio.sparks - sparksToDiamondsRatio.diamonds) / sparksToDiamondsRatio.sparks) * 100
      : 55;

  return {
    grossIapUsdCents,
    netIapUsdCents,
    storeFeeUsdCents,
    diamondLiabilityUsdCents,
    diamondPaidOutUsdCents,
    unspentPaidSparkFloatUsdCents,
    estimatedNetProfitUsdCents,
    estimatedMarginPercent,
    breakEvenDiamondUsdRate,
    avgPaidSparkUsdCents,
    giftUtilizationPercent,
    sparksToDiamondsRatio,
    platformSparkSharePercent,
  };
}
