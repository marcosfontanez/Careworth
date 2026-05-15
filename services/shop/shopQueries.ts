import { supabase } from '@/lib/supabase';
import type {
  ShopItemRow,
  UserInventoryRow,
  SparkWalletRow,
  DiamondWalletRow,
  PurchaseReceiptRow,
} from '@/lib/shop/types';

export type BorderCollectionSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export const shopQueriesService = {
  async getBorderCollections(): Promise<BorderCollectionSummary[]> {
    const { data, error } = await supabase
      .from('border_collections' as any)
      .select('id, slug, name, description')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as BorderCollectionSummary[];
  },

  /**
   * Active Pulse Shop catalog. Fetched **per `type`** so PostgREST `max_rows` (often 1000) never
   * truncates gifts/packs after a long border list — a single global `order by sort_order` can drop
   * high `sort_order` gift rows when total active items exceed the limit.
   */
  async getActiveCatalog(): Promise<ShopItemRow[]> {
    const types = ['border', 'spark_pack', 'gift', 'bundle', 'seasonal_drop', 'sponsored_drop'] as const;
    const results = await Promise.all(
      types.map((type) =>
        supabase
          .from('shop_items' as any)
          .select('*')
          .eq('is_active', true)
          .eq('type', type)
          .order('sort_order', { ascending: true }),
      ),
    );
    for (const r of results) {
      if (r.error) throw r.error;
    }
    const byId = new Map<string, ShopItemRow>();
    for (const r of results) {
      for (const row of (r.data ?? []) as unknown as ShopItemRow[]) {
        byId.set(row.id, row);
      }
    }
    const rows = [...byId.values()].sort((a, b) => {
      const d = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (d !== 0) return d;
      return String(a.id).localeCompare(String(b.id));
    });
    const now = Date.now();
    return rows.filter((row) => {
      if (row.release_at) {
        const t = new Date(row.release_at).getTime();
        if (!Number.isNaN(t) && t > now) return false;
      }
      if (row.expires_at) {
        const t = new Date(row.expires_at).getTime();
        if (!Number.isNaN(t) && t <= now) return false;
      }
      return true;
    });
  },

  async getSparkWallet(userId: string): Promise<SparkWalletRow | null> {
    const { data, error } = await supabase
      .from('spark_wallets' as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data as SparkWalletRow | null;
  },

  async getDiamondWallet(userId: string): Promise<DiamondWalletRow | null> {
    const { data, error } = await supabase
      .from('diamond_wallets' as any)
      .select('*')
      .eq('creator_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data as DiamondWalletRow | null;
  },

  async getUserInventory(userId: string): Promise<UserInventoryRow[]> {
    const { data, error } = await supabase
      .from('user_inventory' as any)
      .select('*')
      .eq('user_id', userId)
      .order('acquired_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as UserInventoryRow[];
  },

  /**
   * Admin grants create `border_gifts` rows with status `pending` until the recipient opens them in-app.
   */
  async getNextPendingTeamBorderGift(userId: string): Promise<{
    giftId: string;
    shopItem: ShopItemRow;
    note: string | null;
  } | null> {
    const { data: gifts, error: gErr } = await supabase
      .from('border_gifts' as any)
      .select('id, shop_item_id, note')
      .eq('recipient_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);
    if (gErr) throw gErr;
    const row = (gifts ?? [])[0] as unknown as
      | { id: string; shop_item_id: string; note: string | null }
      | undefined;
    if (!row) return null;

    const items = await this.getShopItemsByIds([row.shop_item_id]);
    const shopItem = items[0];
    if (!shopItem) return null;

    return { giftId: row.id, shopItem, note: row.note };
  },

  /** Resolves catalog rows for owned items (includes inactive / legacy shop_items). */
  async getShopItemsByIds(ids: string[]): Promise<ShopItemRow[]> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return [];
    const chunkSize = 40;
    const out: ShopItemRow[] = [];
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from('shop_items' as any)
        .select('*')
        .in('id', chunk);
      if (error) throw error;
      out.push(...((data ?? []) as unknown as ShopItemRow[]));
    }
    return out;
  },

  async getProfilesUsernameMap(userIds: string[]): Promise<Record<string, string>> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return {};
    const chunkSize = 40;
    const map: Record<string, string> = {};
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', chunk);
      if (error) throw error;
      for (const row of data ?? []) {
        const id = (row as { id: string }).id;
        const u = String((row as { username?: string }).username ?? '').trim();
        if (id && u) map[id] = u;
      }
    }
    return map;
  },

  async getProfileByUsernameNormalized(normalized: string) {
    const n = normalized.replace(/^@/, '').trim().toLowerCase();
    if (!n) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', n)
      .maybeSingle();
    if (error) throw error;
    if (!data || String(data.username ?? '').toLowerCase() !== n) return null;
    return data;
  },

  async getPurchaseReceipts(userId: string, limit = 30): Promise<PurchaseReceiptRow[]> {
    const { data, error } = await supabase
      .from('purchase_receipts' as any)
      .select('id, user_id, platform, store_product_id, external_transaction_id, shop_item_id, validation_status, processed_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as PurchaseReceiptRow[];
  },

  async ensureWallets(userId: string): Promise<void> {
    const { error } = await supabase.rpc('economy_create_or_get_wallets' as any, {
      p_user_id: userId,
    });
    if (error) throw error;
  },
};
