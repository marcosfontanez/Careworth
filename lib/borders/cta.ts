/**
 * Canonical CTA copy for borders. Centralised so feed/shop/vault never
 * disagree on what an action says. Existing `lib/shop/borderDisplayModel`
 * still owns the *resolution* of which CTA applies — this file owns the
 * *strings* used by the new shared components.
 */

import type { BorderCategory } from '@/lib/borders/category';

export const BORDER_CTA = {
  buyNow: 'Buy now',
  claimFree: 'Claim free',
  giftBorder: 'Send as gift',
  equip: 'Equip border',
  equipped: 'Equipped',
  buyAgain: 'Buy again',
  changeBorder: 'Change active border',
  viewVault: 'Open my vault',
  viewShop: 'Open Pulse Shop',
  viewCollection: 'View collection',
  viewDetails: 'View border',
  supportCause: 'Support this cause',
  visitPartner: 'Visit partner',
  appStorePurchase: 'Direct purchase · App Store / Google Play',
  webViewOnly: 'Browse-only on web — buy in the app',
} as const;

/** Hero title verbs per category — used by MonthlyHeroRail tile titles. */
export const BORDER_CATEGORY_KICKER: Record<BorderCategory, string> = {
  holiday: 'Free this month',
  premium: 'Premium drop',
  charity: 'Limited charity drop',
  advertiser: 'Brought to you by',
  reward: 'Event reward',
  beta: 'Beta exclusive',
  leaderboard: 'Monthly leaderboard',
  legacy: 'Heritage piece',
};

/** Short eyebrow line for hero / detail subtitle when category is unique. */
export const BORDER_CATEGORY_TAGLINE: Record<BorderCategory, string> = {
  holiday: 'Free for the whole community — claim before the month ends.',
  premium: 'Limited monthly Pulse Shop drop.',
  charity: 'A portion of every claim supports the partner cause.',
  advertiser: 'A free, time-limited piece sponsored by a partner.',
  reward: 'Earned through an in-app event.',
  beta: 'Reserved for Beta testers — not sold.',
  leaderboard: 'Earned by Top 5 monthly Pulse winners.',
  legacy: 'Retired from the active catalog — heritage piece.',
};
