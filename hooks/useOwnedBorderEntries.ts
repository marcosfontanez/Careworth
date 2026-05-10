import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shopKeys } from '@/lib/shop/queryKeys';
import { shopQueriesService } from '@/services/shop/shopQueries';
import { useUserInventory } from '@/hooks/useShopEconomy';
import { useBorderCollectionsMap } from '@/hooks/useBorderCollectionsMap';
import type { OwnedBorderEntry } from '@/lib/borders/ownedTypes';
import type { ShopItemRow } from '@/lib/shop/types';

export function useOwnedBorderEntries(userId: string | undefined) {
  const invQuery = useUserInventory(userId);
  const collectionsQ = useBorderCollectionsMap();

  const borderRows = useMemo(
    () => (invQuery.data ?? []).filter((r) => r.item_kind === 'border'),
    [invQuery.data],
  );

  const shopIds = useMemo(() => [...new Set(borderRows.map((r) => r.shop_item_id))].sort(), [borderRows]);

  const idKey = shopIds.join('|');

  const itemsQuery = useQuery({
    queryKey: shopKeys.shopItemsByIds(idKey),
    queryFn: () => shopQueriesService.getShopItemsByIds(shopIds),
    enabled: !!userId && shopIds.length > 0,
    staleTime: 60_000,
  });

  const giftGiverIds = useMemo(() => {
    const s = new Set<string>();
    for (const r of borderRows) {
      if (r.gifted_by_user_id) s.add(r.gifted_by_user_id);
    }
    return [...s].sort();
  }, [borderRows]);

  const giftKey = giftGiverIds.join('|');

  const giftNamesQuery = useQuery({
    queryKey: shopKeys.profileUsernames(giftKey),
    queryFn: () => shopQueriesService.getProfilesUsernameMap(giftGiverIds),
    enabled: giftGiverIds.length > 0,
    staleTime: 120_000,
  });

  const entries: OwnedBorderEntry[] = useMemo(() => {
    const itemsMap = new Map<string, ShopItemRow>((itemsQuery.data ?? []).map((i) => [i.id, i]));
    const names = giftNamesQuery.data ?? {};
    const nameById = collectionsQ.nameById;

    const out: OwnedBorderEntry[] = [];
    for (const inventory of borderRows) {
      const item = itemsMap.get(inventory.shop_item_id);
      if (!item || item.type !== 'border') continue;
      const collectionName = item.collection_id ? nameById.get(item.collection_id) ?? null : null;
      const giftedByUsername = inventory.gifted_by_user_id
        ? names[inventory.gifted_by_user_id] ?? null
        : null;
      out.push({ inventory, item, collectionName, giftedByUsername });
    }
    return out;
  }, [borderRows, itemsQuery.data, giftNamesQuery.data, collectionsQ.nameById]);

  const isLoading =
    invQuery.isLoading ||
    (!!userId && shopIds.length > 0 && itemsQuery.isLoading) ||
    (giftGiverIds.length > 0 && giftNamesQuery.isLoading);

  return {
    entries,
    isLoading,
    refetch: async () => {
      await Promise.all([invQuery.refetch(), itemsQuery.refetch(), giftNamesQuery.refetch(), collectionsQ.refetch()]);
    },
    invQuery,
    itemsQuery,
  };
}
