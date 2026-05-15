"use server";

import { revalidatePath } from "next/cache";

import { writeAdminAudit } from "@/lib/admin/audit-log";
import { createAdminDataSupabaseClient } from "@/lib/supabase/admin-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

async function requireStaffId(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return null;
    const { data: profile } = await supabase.from("profiles").select("role_admin").eq("id", user.id).maybeSingle();
    if (!profile?.role_admin) return null;
    return user.id;
  } catch {
    return null;
  }
}

async function resolveRecipientUserId(raw: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const s = raw.trim();
  if (!s) return { ok: false, error: "Enter a user id or @handle." };
  if (UUID_RE.test(s)) {
    const admin = await createAdminDataSupabaseClient();
    const { data, error } = await admin.from("profiles").select("id").eq("id", s).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "No profile found for that user id." };
    return { ok: true, id: data.id as string };
  }
  const handle = normalizeHandle(s);
  if (!handle) return { ok: false, error: "Enter a valid @handle." };
  const admin = await createAdminDataSupabaseClient();
  const { data, error } = await admin.from("profiles").select("id").ilike("username", handle).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: `No user with handle @${handle}.` };
  return { ok: true, id: data.id as string };
}

function mapRpcErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("not_allowed")) return "You are not allowed to grant items (staff only).";
  if (m.includes("invalid_args")) return "Missing recipient or catalog item.";
  if (m.includes("user_not_found")) return "Recipient profile was not found.";
  if (m.includes("item_not_found")) return "That shop item id does not exist.";
  if (m.includes("invalid_spark_pack")) return "This Sparks pack has no valid spark_amount in the catalog.";
  if (m.includes("duplicate_border")) return "That user already owns this border in Pulse Shop inventory.";
  if (m.includes("unsupported_shop_item_type"))
    return "Grants are only automated for type “border” and “spark_pack”. Other types need a custom flow.";
  if (m.includes("idempotency_conflict")) return "Idempotency key conflict—try again without a key or use a fresh key.";
  return message;
}

export async function grantShopCatalogItemAction(input: {
  recipientRaw: string;
  shopItemId: string;
  note?: string;
  idempotencyKey?: string;
}): Promise<{ ok: true; detail?: string } | { ok: false; error: string }> {
  const staffId = await requireStaffId();
  if (!staffId) return { ok: false, error: "Unauthorized." };

  const shopItemId = input.shopItemId.trim();
  if (!UUID_RE.test(shopItemId)) return { ok: false, error: "Choose a valid catalog item." };

  const resolved = await resolveRecipientUserId(input.recipientRaw);
  if (!resolved.ok) return { ok: false, error: resolved.error };

  const note = input.note?.trim() || null;
  const idem = input.idempotencyKey?.trim() || null;

  const sessionSb = await createSupabaseServerClient();
  const { data, error } = await sessionSb.rpc("economy_admin_grant_shop_item", {
    p_recipient_user_id: resolved.id,
    p_shop_item_id: shopItemId,
    p_note: note,
    p_idempotency_key: idem,
  });

  if (error) {
    return { ok: false, error: mapRpcErrorMessage(error.message) };
  }

  const payload = data as { idempotent?: boolean; kind?: string; spark_amount?: number } | null;
  const detail = payload?.idempotent
    ? "Idempotent replay (no duplicate credit)."
    : payload?.kind === "spark_pack" && payload.spark_amount != null
      ? `Credited ${payload.spark_amount} promo Sparks.`
      : payload?.kind === "border"
        ? "Border queued as an in-app gift. It does not appear in Pulse Shop inventory until the recipient opens the app and taps Open on the gift prompt (works from any screen, not only the Feed tab)."
        : undefined;

  const admin = await createAdminDataSupabaseClient();
  await writeAdminAudit(admin, {
    staffUserId: staffId,
    action: "grant_shop_catalog_item",
    entityType: "user",
    entityId: resolved.id,
    metadata: {
      shop_item_id: shopItemId,
      note,
      idempotency_key: idem,
      rpc_result: data,
    },
  });

  revalidatePath("/admin/merchandising");
  return { ok: true, detail };
}
