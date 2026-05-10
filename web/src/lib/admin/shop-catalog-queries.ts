import "server-only";

import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type AdminShopItemRow = {
  id: string;
  slug: string;
  type: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_retired: boolean | null;
  availability_status: string | null;
  store_product_id_ios: string | null;
  store_product_id_android: string | null;
  spark_amount: number | null;
  spark_price: number | null;
  sort_order: number | null;
  created_at: string | null;
};

/** Present when type === "border"; sourced from admin_shop_border_stats RPC. */
export type AdminShopBorderStats = {
  owners: number;
  acqPaid: number;
  acqFree: number;
  acqStaff: number;
  acqTotal: number;
};

export type AdminShopGrantLogRow = {
  id: string;
  created_at: string;
  note: string | null;
  recipient_user_id: string;
  admin_user_id: string;
  shop_item_id: string;
  wallet_transaction_id: string | null;
  metadata: Record<string, unknown> | null;
  shop_items: { slug: string; name: string; type: string } | null;
  recipient_label: string;
  staff_label: string;
};

type AdminShopBorderStatsRpcRow = {
  shop_item_id: string;
  owners: number;
  acq_paid: number;
  acq_free: number;
  acq_staff: number;
};

export async function loadShopBorderAdminStats(): Promise<Record<string, AdminShopBorderStats>> {
  if (!isSupabaseConfigured()) return {};
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase.rpc("admin_shop_border_stats");
    if (error) {
      console.warn("loadShopBorderAdminStats:", error.message);
      return {};
    }
    const rows = (data ?? []) as AdminShopBorderStatsRpcRow[];
    const out: Record<string, AdminShopBorderStats> = {};
    for (const r of rows) {
      const paid = Number(r.acq_paid) || 0;
      const free = Number(r.acq_free) || 0;
      const staff = Number(r.acq_staff) || 0;
      out[r.shop_item_id] = {
        owners: Number(r.owners) || 0,
        acqPaid: paid,
        acqFree: free,
        acqStaff: staff,
        acqTotal: paid + free + staff,
      };
    }
    return out;
  } catch (e) {
    console.warn("loadShopBorderAdminStats:", e);
    return {};
  }
}

export async function loadShopItemsCatalog(): Promise<AdminShopItemRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data, error } = await supabase
      .from("shop_items")
      .select(
        "id, slug, type, name, description, is_active, is_retired, availability_status, store_product_id_ios, store_product_id_android, spark_amount, spark_price, sort_order, created_at",
      )
      .order("type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) {
      console.warn("loadShopItemsCatalog:", error.message);
      return [];
    }
    return (data ?? []) as AdminShopItemRow[];
  } catch (e) {
    console.warn("loadShopItemsCatalog:", e);
    return [];
  }
}

export async function loadRecentShopAdminGrants(limit = 50): Promise<AdminShopGrantLogRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createAdminDataSupabaseClient();
    const { data: grants, error } = await supabase
      .from("shop_admin_item_grants")
      .select(
        "id, created_at, note, recipient_user_id, admin_user_id, shop_item_id, wallet_transaction_id, metadata, shop_items (slug, name, type)",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.warn("loadRecentShopAdminGrants:", error.message);
      return [];
    }
    const rows = grants ?? [];
    const ids = new Set<string>();
    for (const g of rows) {
      ids.add(g.recipient_user_id as string);
      ids.add(g.admin_user_id as string);
    }
    const idList = [...ids];
    if (idList.length === 0) return [];

    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", idList);
    const map = new Map((profs ?? []).map((p) => [p.id as string, p]));

    function label(uid: string): string {
      const p = map.get(uid);
      if (!p) return uid.slice(0, 8) + "…";
      const h = p.username ? `@${p.username}` : "";
      return [p.display_name as string, h].filter(Boolean).join(" · ") || uid.slice(0, 8) + "…";
    }

    return rows.map((g) => {
      const rawSi = g.shop_items as { slug: string; name: string; type: string } | { slug: string; name: string; type: string }[] | null;
      const shopItemJoined =
        rawSi == null ? null : Array.isArray(rawSi) ? rawSi[0] ?? null : rawSi;

      return {
        id: g.id as string,
        created_at: g.created_at as string,
        note: (g.note as string | null) ?? null,
        recipient_user_id: g.recipient_user_id as string,
        admin_user_id: g.admin_user_id as string,
        shop_item_id: g.shop_item_id as string,
        wallet_transaction_id: (g.wallet_transaction_id as string | null) ?? null,
        metadata: (g.metadata as Record<string, unknown> | null) ?? null,
        shop_items: shopItemJoined,
        recipient_label: label(g.recipient_user_id as string),
        staff_label: label(g.admin_user_id as string),
      };
    });
  } catch (e) {
    console.warn("loadRecentShopAdminGrants:", e);
    return [];
  }
}
