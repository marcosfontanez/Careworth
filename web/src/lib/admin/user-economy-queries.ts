import "server-only";

import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidLike(s: string): boolean {
  return UUID_RE.test(s.trim());
}

export type AdminUserEconomyProfile = {
  id: string;
  displayName: string | null;
  username: string | null;
};

export type SparkWalletRow = {
  paid_sparks_balance: number;
  promo_sparks_balance: number;
  total_sparks_spent: number;
  total_sparks_purchased: number;
  updated_at: string;
};

export type DiamondWalletRow = {
  diamonds_pending: number;
  diamonds_available: number;
  diamonds_paid_out: number;
  total_diamonds_earned: number;
  updated_at: string;
};

export type WalletLedgerRow = {
  id: string;
  user_id: string | null;
  creator_id: string | null;
  wallet_type: string;
  transaction_type: string;
  direction: string;
  amount: number;
  status: string;
  source_type: string | null;
  source_id: string | null;
  reserve_release_at: string | null;
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PurchaseReceiptRow = {
  id: string;
  platform: string;
  store_product_id: string;
  external_transaction_id: string;
  shop_item_id: string | null;
  validation_status: string;
  processed_at: string | null;
  created_at: string;
};

export type UserInventoryLedgerRow = {
  id: string;
  shop_item_id: string;
  item_kind: string;
  acquisition_source: string;
  acquisition_txn_id: string | null;
  gifted_by_user_id: string | null;
  acquired_at: string;
  metadata: Record<string, unknown>;
};

export type UserEconomyAudit = {
  profile: AdminUserEconomyProfile | null;
  sparkWallet: SparkWalletRow | null;
  diamondWallet: DiamondWalletRow | null;
  walletLedger: WalletLedgerRow[];
  purchaseReceipts: PurchaseReceiptRow[];
  inventory: UserInventoryLedgerRow[];
  /** shop_item_id → short label for tables */
  shopItemLabels: Record<string, string>;
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/**
 * Economy / shop audit trail for a single user (service-role or admin session).
 * Combines wallet_transactions (Sparks, Diamonds, border audit rows), IAP receipts, and shop inventory.
 */
export async function loadUserEconomyAudit(userId: string): Promise<UserEconomyAudit | null> {
  if (!isSupabaseConfigured() || !isUuidLike(userId)) return null;

  try {
    const supabase = await createAdminDataSupabaseClient();

    const [
      profileRes,
      sparkRes,
      diamondRes,
      walletRes,
      receiptRes,
      inventoryRes,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, username")
        .eq("id", userId.trim())
        .maybeSingle(),
      supabase.from("spark_wallets").select("*").eq("user_id", userId.trim()).maybeSingle(),
      supabase.from("diamond_wallets").select("*").eq("creator_id", userId.trim()).maybeSingle(),
      supabase
        .from("wallet_transactions")
        .select(
          "id, user_id, creator_id, wallet_type, transaction_type, direction, amount, status, source_type, source_id, reserve_release_at, idempotency_key, metadata, created_at",
        )
        .or(`user_id.eq.${userId.trim()},creator_id.eq.${userId.trim()}`)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("purchase_receipts")
        .select(
          "id, platform, store_product_id, external_transaction_id, shop_item_id, validation_status, processed_at, created_at",
        )
        .eq("user_id", userId.trim())
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("user_inventory")
        .select("id, shop_item_id, item_kind, acquisition_source, acquisition_txn_id, gifted_by_user_id, acquired_at, metadata")
        .eq("user_id", userId.trim())
        .order("acquired_at", { ascending: false })
        .limit(200),
    ]);

    if (profileRes.error) {
      console.error("loadUserEconomyAudit profile:", profileRes.error.message);
    }

    if (walletRes.error) {
      console.error("loadUserEconomyAudit wallet_transactions:", walletRes.error.message);
    }
    if (receiptRes.error) {
      console.error("loadUserEconomyAudit purchase_receipts:", receiptRes.error.message);
    }
    if (inventoryRes.error) {
      console.error("loadUserEconomyAudit user_inventory:", inventoryRes.error.message);
    }

    const profileRow = profileRes.data;
    const profile: AdminUserEconomyProfile | null = profileRow
      ? {
          id: profileRow.id as string,
          displayName: (profileRow.display_name as string | null) ?? null,
          username: (profileRow.username as string | null) ?? null,
        }
      : null;

    const sparkWallet = sparkRes.data as SparkWalletRow | null;
    const diamondWallet = diamondRes.data as DiamondWalletRow | null;

    const walletLedger: WalletLedgerRow[] = (walletRes.data ?? []).map((row) => ({
      id: row.id as string,
      user_id: (row.user_id as string | null) ?? null,
      creator_id: (row.creator_id as string | null) ?? null,
      wallet_type: row.wallet_type as string,
      transaction_type: row.transaction_type as string,
      direction: row.direction as string,
      amount: Number(row.amount),
      status: row.status as string,
      source_type: (row.source_type as string | null) ?? null,
      source_id: (row.source_id as string | null) ?? null,
      reserve_release_at: (row.reserve_release_at as string | null) ?? null,
      idempotency_key: (row.idempotency_key as string | null) ?? null,
      metadata: asRecord(row.metadata),
      created_at: row.created_at as string,
    }));

    const purchaseReceipts: PurchaseReceiptRow[] = (receiptRes.data ?? []).map((row) => ({
      id: row.id as string,
      platform: row.platform as string,
      store_product_id: row.store_product_id as string,
      external_transaction_id: row.external_transaction_id as string,
      shop_item_id: (row.shop_item_id as string | null) ?? null,
      validation_status: row.validation_status as string,
      processed_at: (row.processed_at as string | null) ?? null,
      created_at: row.created_at as string,
    }));

    const inventory: UserInventoryLedgerRow[] = (inventoryRes.data ?? []).map((row) => ({
      id: row.id as string,
      shop_item_id: row.shop_item_id as string,
      item_kind: row.item_kind as string,
      acquisition_source: row.acquisition_source as string,
      acquisition_txn_id: (row.acquisition_txn_id as string | null) ?? null,
      gifted_by_user_id: (row.gifted_by_user_id as string | null) ?? null,
      acquired_at: row.acquired_at as string,
      metadata: asRecord(row.metadata),
    }));

    const shopIds = new Set<string>();
    for (const i of inventory) shopIds.add(i.shop_item_id);
    for (const r of purchaseReceipts) {
      if (r.shop_item_id) shopIds.add(r.shop_item_id);
    }

    const shopItemLabels: Record<string, string> = {};
    if (shopIds.size > 0) {
      const { data: shopRows } = await supabase
        .from("shop_items")
        .select("id, slug, name")
        .in("id", [...shopIds]);
      for (const s of shopRows ?? []) {
        const id = s.id as string;
        const slug = s.slug as string;
        const name = s.name as string;
        shopItemLabels[id] = name ? `${slug} · ${name}` : slug;
      }
    }

    return {
      profile,
      sparkWallet,
      diamondWallet,
      walletLedger,
      purchaseReceipts,
      inventory,
      shopItemLabels,
    };
  } catch (e) {
    console.error("loadUserEconomyAudit exception:", e);
    return null;
  }
}
