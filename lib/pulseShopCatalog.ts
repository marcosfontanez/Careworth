export type ShopTabKey = 'borders' | 'credits' | 'gifts' | 'more';
/** UI: "Sparks" tab uses key `credits` + deep link `?tab=sparks` or `?tab=credits`. */

export type GiftContext = 'live' | 'post' | 'profile';

export interface CatalogGift {
  id: string;
  name: string;
  icon: 'heart' | 'cafe' | 'color-filter-outline' | 'ribbon';
  sparks: number;
  contexts: GiftContext[];
  accent: string;
}

export interface ShopBorder {
  id: string;
  name: string;
  rarity: string;
  rarityColor: string;
  ringColor: string;
  description: string;
  /** Initial owned state for session demo; screen may update after “purchase”. */
  ownedDefault: boolean;
  /** Whether policy allows gifting this border to others. */
  giftable: boolean;
  limited?: boolean;
  featured?: boolean;
}

/** Mock: recipient handles (lowercase, no @) who already own a border — blocks gift. */
const RECIPIENT_OWNS_BORDER: Record<string, string[]> = {
  'neon-orbit': [],
  'border_beta_pioneer': [],
};

export const SHOP_BORDERS: ShopBorder[] = [
  {
    id: 'neon-orbit',
    name: 'Neon Orbit',
    rarity: 'Epic',
    rarityColor: '#A855F7',
    ringColor: '#22D3EE',
    description: 'Dual-tone electric orbit.',
    ownedDefault: false,
    giftable: true,
    featured: true,
  },
  {
    id: 'border_beta_pioneer',
    name: 'Beta Pioneer',
    rarity: 'Uncommon',
    rarityColor: '#22C55E',
    ringColor: '#38BDF8',
    description: 'Hex signal for early PulseVerse voices.',
    ownedDefault: true,
    giftable: true,
  },
];

export function featuredBorder(): ShopBorder {
  return SHOP_BORDERS.find((b) => b.featured) ?? SHOP_BORDERS[0];
}

export function browseBorders(): ShopBorder[] {
  return SHOP_BORDERS.filter((b) => !b.featured);
}

export interface CreditPack {
  sparks: number;
  tag?: 'Best Value' | 'Most Popular';
}

export const CREDIT_PACKS: CreditPack[] = [
  { sparks: 500 },
  { sparks: 1200, tag: 'Most Popular' },
  { sparks: 2500, tag: 'Best Value' },
  { sparks: 6500 },
];

export const CATALOG_GIFTS: CatalogGift[] = [
  {
    id: 'pulse',
    name: 'Pulse',
    icon: 'heart',
    sparks: 50,
    contexts: ['live', 'post', 'profile'],
    accent: '#F472B6',
  },
  {
    id: 'coffee',
    name: 'Coffee Drop',
    icon: 'cafe',
    sparks: 100,
    contexts: ['live', 'post', 'profile'],
    accent: '#D4A63A',
  },
  {
    id: 'halo',
    name: 'Halo',
    icon: 'color-filter-outline',
    sparks: 200,
    contexts: ['live', 'profile'],
    accent: '#A78BFA',
  },
  {
    id: 'crown',
    name: 'Crown',
    icon: 'ribbon',
    sparks: 500,
    contexts: ['live', 'post', 'profile'],
    accent: '#22D3EE',
  },
];

export const MORE_SHOP_SECTIONS: {
  icon: 'layers-outline' | 'snow-outline' | 'megaphone-outline' | 'receipt-outline' | 'bookmark-outline' | 'heart-circle-outline';
  title: string;
  subtitle: string;
}[] = [
  {
    icon: 'layers-outline',
    title: 'Bundles',
    subtitle: 'Curated packs — coming soon',
  },
  {
    icon: 'snow-outline',
    title: 'Seasonal drops',
    subtitle: 'Limited runs tied to moments & holidays',
  },
  {
    icon: 'megaphone-outline',
    title: 'Sponsored highlights',
    subtitle: 'Brand-safe creator features',
  },
  {
    icon: 'receipt-outline',
    title: 'Purchase history',
    subtitle: 'Receipts & restores',
  },
  {
    icon: 'bookmark-outline',
    title: 'Wishlist',
    subtitle: 'Save items for later',
  },
  {
    icon: 'heart-circle-outline',
    title: 'Creator support',
    subtitle: 'Campaigns & patron-style boosts',
  },
];

const CONTEXT_LABEL: Record<GiftContext, string> = {
  live: 'Live',
  post: 'Posts',
  profile: 'Profile',
};

export function formatGiftContexts(contexts: GiftContext[]): string {
  return contexts.map((c) => CONTEXT_LABEL[c]).join(' · ');
}

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

export function displayHandle(raw: string): string {
  const h = normalizeHandle(raw);
  return h ? `@${h}` : '';
}

export function recipientOwnsBorder(borderId: string, handleRaw: string): boolean {
  const h = normalizeHandle(handleRaw);
  if (!h) return false;
  return (RECIPIENT_OWNS_BORDER[borderId] ?? []).includes(h);
}

/** Mock resolve @handle → display name */
export function mockResolveRecipientName(handleRaw: string): string | null {
  const h = normalizeHandle(handleRaw);
  if (!h) return null;
  const map: Record<string, string> = {
    alexr: 'Alex Rivera',
    janedoe: 'Jane Doe',
    nursejamie: 'Jamie Chen',
    topcreator: 'Jordan Lee',
  };
  return map[h] ?? (h ? h.charAt(0).toUpperCase() + h.slice(1) : null);
}
