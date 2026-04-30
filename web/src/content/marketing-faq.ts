import { getMarketingFaqItems } from "@/lib/marketing-copy/faq";

/** English FAQ (e.g. static imports). Prefer `getMarketingFaqItems(locale)` for localized pages. */
export const marketingFaqItems = getMarketingFaqItems("en");

export const supportFaqItems = marketingFaqItems;
