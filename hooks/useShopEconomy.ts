import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { shopKeys } from '@/lib/shop/queryKeys';
import { shopQueriesService } from '@/services/shop/shopQueries';
import { purchaseService } from '@/services/shop/purchaseService';
import { pickFeaturedBorder } from '@/lib/shop/catalogUtils';
import type { PurchaseReceiptRow, ShopItemRow, UserInventoryRow } from '@/lib/shop/types';
import { totalSparkBalance } from '@/lib/shop/types';

export function useShopCatalog() {
  return useQuery({
    queryKey: shopKeys.catalog(),
    queryFn: () => shopQueriesService.getActiveCatalog(),
    staleTime: 60_000,
  });
}

export function useSparkWallet(userId: string | undefined) {
  return useQuery({
    queryKey: shopKeys.sparkWallet(userId),
    queryFn: async () => {
      if (!userId) return null;
      await shopQueriesService.ensureWallets(userId);
      return shopQueriesService.getSparkWallet(userId);
    },
    enabled: !!userId,
    staleTime: 15_000,
  });
}

export function useUserInventory(userId: string | undefined) {
  return useQuery({
    queryKey: shopKeys.inventory(userId),
    queryFn: () => (userId ? shopQueriesService.getUserInventory(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 15_000,
  });
}

export function usePurchaseReceipts(userId: string | undefined, limit = 25) {
  return useQuery<PurchaseReceiptRow[]>({
    queryKey: shopKeys.receipts(userId),
    queryFn: () =>
      userId
        ? shopQueriesService.getPurchaseReceipts(userId, limit)
        : Promise.resolve([] as PurchaseReceiptRow[]),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useProfileByHandle(normalizedHandle: string | undefined, enabled: boolean) {
  const h = normalizedHandle?.replace(/^@/, '').trim().toLowerCase();
  return useQuery({
    queryKey: shopKeys.profileByUsername(h ?? ''),
    queryFn: () => shopQueriesService.getProfileByUsernameNormalized(h!),
    enabled: !!h && enabled,
    staleTime: 30_000,
  });
}

function inventoryByShopItemId(inventory: UserInventoryRow[]): Map<string, UserInventoryRow> {
  const m = new Map<string, UserInventoryRow>();
  for (const row of inventory) {
    m.set(row.shop_item_id, row);
  }
  return m;
}

export function useShopInventoryState(userId: string | undefined) {
  const invQuery = useUserInventory(userId);
  const map = useMemo(
    () => inventoryByShopItemId(invQuery.data ?? []),
    [invQuery.data],
  );

  const equippedBorder = useMemo(() => {
    for (const row of invQuery.data ?? []) {
      if (row.is_equipped && row.item_kind === 'border') return row;
    }
    return null;
  }, [invQuery.data]);

  const ownsBorder = useCallback(
    (shopItemId: string) => map.has(shopItemId),
    [map],
  );

  const inventoryRowForBorder = useCallback(
    (shopItemId: string) => map.get(shopItemId),
    [map],
  );

  return { ...invQuery, map, equippedBorder, ownsBorder, inventoryRowForBorder };
}

export function useShopDerived(catalog: ShopItemRow[] | undefined) {
  return useMemo(() => {
    const items = catalog ?? [];
    const borders = items.filter((i) => i.type === 'border');
    const packs = items.filter((i) => i.type === 'spark_pack');
    const gifts = items.filter((i) => i.type === 'gift');
    const featured = pickFeaturedBorder(borders);
    const browseBorders = featured ? borders.filter((b) => b.id !== featured.id) : borders;
    return { borders, packs, gifts, featured, browseBorders };
  }, [catalog]);
}

export function useEnsureShopWallets(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    shopQueriesService.ensureWallets(userId).catch(() => {
      /* non-fatal; wallet query will surface errors */
    });
  }, [userId]);
}

export function useShopRefetchers(userId: string | undefined) {
  const qc = useQueryClient();

  const refetchWallet = useCallback(() => {
    return qc.refetchQueries({ queryKey: shopKeys.sparkWallet(userId) });
  }, [qc, userId]);

  const refetchInventory = useCallback(() => {
    return qc.refetchQueries({ queryKey: shopKeys.inventory(userId) });
  }, [qc, userId]);

  const refetchReceipts = useCallback(() => {
    return qc.refetchQueries({ queryKey: shopKeys.receipts(userId) });
  }, [qc, userId]);

  /** Await network refetches so success UI shows updated balances/ownership immediately. */
  const refreshAfterPurchase = useCallback(async () => {
    await Promise.all([refetchWallet(), refetchInventory(), refetchReceipts()]);
  }, [refetchWallet, refetchInventory, refetchReceipts]);

  return { refetchWallet, refetchInventory, refetchReceipts, refreshAfterPurchase };
}

export function useEquipBorderMutation(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inventoryItemId: string) => purchaseService.equipBorder(inventoryItemId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: shopKeys.inventory(userId) });
    },
  });
}

export function useSparkBalanceNumber(wallet: ReturnType<typeof useSparkWallet>['data']) {
  return useMemo(() => totalSparkBalance(wallet ?? null), [wallet]);
}
