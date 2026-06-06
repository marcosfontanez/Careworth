import { describe, expect, it } from "vitest";

import { computeEconomyProfitModel, computeSparkPackGrossUsdCents, parseDisplayPriceUsdCents } from "./economy-math";

describe("economy-math", () => {
  it("parses display prices", () => {
    expect(parseDisplayPriceUsdCents("$4.99")).toBe(499);
    expect(parseDisplayPriceUsdCents("")).toBe(0);
  });

  it("estimates profit on a fully gifted 500 pack at 30% store / 1c diamond", () => {
    const packs = [
      {
        shopItemId: "1",
        slug: "sparks-500",
        name: "500 Sparks",
        sparkAmount: 500,
        priceUsdCents: 499,
        validReceiptCount: 1,
        refundedReceiptCount: 0,
      },
    ];
    const gross = computeSparkPackGrossUsdCents(packs);
    expect(gross).toBe(499);

    const model = computeEconomyProfitModel({
      wallets: {
        sparkPaidBalanceTotal: 0,
        sparkPromoBalanceTotal: 0,
        sparkTotalPurchased: 500,
        sparkTotalSpent: 500,
        diamondPendingTotal: 0,
        diamondAvailableTotal: 225,
        diamondPaidOutTotal: 0,
        diamondTotalEarned: 225,
      },
      sparkPackIap: packs,
      ledgerSparkPurchaseUnits: 500,
      ledgerGiftSparkUnits: 500,
      sparksToDiamondsRatio: { sparks: 100, diamonds: 45 },
      assumptions: { storeFeePercent: 30, diamondUsdRate: 0.01, payoutProcessorPercent: 0 },
    });

    expect(model.netIapUsdCents).toBe(349);
    expect(model.diamondLiabilityUsdCents).toBe(225);
    expect(model.estimatedNetProfitUsdCents).toBe(124);
  });
});
