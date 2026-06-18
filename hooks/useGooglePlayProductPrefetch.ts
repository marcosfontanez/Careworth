import type { ShopItemRow } from '@/lib/shop/types';
import { useStoreProductAvailability } from '@/hooks/useStoreProductAvailability';

/** @deprecated Use `useStoreProductAvailability` (iOS + Android). Kept for existing imports. */
export function useGooglePlayProductPrefetch(catalog: ShopItemRow[] | undefined, enabled: boolean) {
  useStoreProductAvailability(catalog, enabled);
}
