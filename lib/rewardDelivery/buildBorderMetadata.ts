import type { ShopItemRow } from '@/lib/shop/types';
import { ringPreviewColor } from '@/lib/shop/catalogUtils';
import type { BorderRewardMetadata } from '@/lib/rewardDelivery/types';

export function buildBorderRewardMetadata(
  item: ShopItemRow,
  inventoryItemId: string | undefined,
  overrides?: Partial<BorderRewardMetadata>,
): BorderRewardMetadata {
  return {
    kind: 'border',
    shop_item_id: item.id,
    inventory_item_id: inventoryItemId,
    border_name: item.name,
    border_source: overrides?.border_source ?? 'purchased',
    rarity_slug: item.rarity ?? null,
    rarity_label: item.rarity_tier ?? item.rarity ?? null,
    preview_image_url: item.image_url ?? item.animation_url ?? null,
    ring_preview_hex: ringPreviewColor(item),
    ...overrides,
  };
}
