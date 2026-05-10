/**
 * Status & badge hierarchy — visual weight guidance for small surfaces.
 *
 * Priority (strongest → weakest):
 * 1. Hero / preview visual
 * 2. Item name
 * 3. Primary status (Equipped, Owned ribbon, price)
 * 4. Primary action
 * 5. Secondary metadata (source, season, rank)
 *
 * On compact cards (shop tile, inventory tile), show at most:
 * - 1× rarity badge (always allowed — strongest metadata chip)
 * - Up to 2× secondary chips (e.g. source + motion OR legacy + gift)
 * De-prioritize or omit: duplicate tier info, long prose, 3+ accent colors.
 */
export const statusHierarchy = {
  maxSecondaryChipsOnCompactCard: 2,
  /** Lower number = stronger emphasis tier */
  emphasisTier: {
    rarity: 1,
    equipped: 2,
    ownership: 3,
    primaryAction: 4,
    source: 5,
    availability: 5,
    motion: 6,
    rank: 6,
    season: 7,
    pulseScore: 3,
    featured: 2,
    promotional: 6,
  } as const,
} as const;
