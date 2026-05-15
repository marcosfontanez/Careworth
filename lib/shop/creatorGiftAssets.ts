/**
 * Bundled catalog art for creator Sparks gifts (stable filenames in assets/images/shop-gifts).
 * Prefer these over remote `image_url` so grids work offline and ship consistent store art.
 */

export const CREATOR_GIFT_SLUGS = [
  'pulse',
  'coffee-drop',
  'halo',
  'crown',
  'spotlight-moment',
  'standing-encore',
  'pulse-orbit',
  'night-residency',
  'healers-monument',
  'pulse-nova',
] as const;

export type CreatorGiftSlug = (typeof CREATOR_GIFT_SLUGS)[number];

const CREATOR_GIFT_ART: Record<CreatorGiftSlug, number> = {
  pulse: require('@/assets/images/shop-gifts/gift-pulse.png'),
  'coffee-drop': require('@/assets/images/shop-gifts/gift-coffee-drop.png'),
  halo: require('@/assets/images/shop-gifts/gift-halo.png'),
  crown: require('@/assets/images/shop-gifts/gift-crown.png'),
  'spotlight-moment': require('@/assets/images/shop-gifts/gift-spotlight-moment.png'),
  'standing-encore': require('@/assets/images/shop-gifts/gift-standing-encore.png'),
  'pulse-orbit': require('@/assets/images/shop-gifts/gift-pulse-orbit.png'),
  'night-residency': require('@/assets/images/shop-gifts/gift-night-residency.png'),
  'healers-monument': require('@/assets/images/shop-gifts/gift-healers-monument.png'),
  'pulse-nova': require('@/assets/images/shop-gifts/gift-pulse-nova.png'),
};

export function creatorGiftBundledSource(slug: string | null | undefined): number | null {
  const k = slug?.toLowerCase().trim() ?? '';
  if (k in CREATOR_GIFT_ART) return CREATOR_GIFT_ART[k as CreatorGiftSlug];
  return null;
}
