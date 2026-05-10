import type { ShopItemRow, UserInventoryRow } from '@/lib/shop/types';

/** One owned border row joined with catalog + optional display helpers. */
export type OwnedBorderEntry = {
  inventory: UserInventoryRow;
  item: ShopItemRow;
  collectionName: string | null;
  giftedByUsername: string | null;
};
