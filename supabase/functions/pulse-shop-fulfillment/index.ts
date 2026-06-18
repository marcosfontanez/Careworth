/**
 * Pulse Shop fulfillment — server-side receipt validation + economy RPCs.
 *
 * Deploy: npx supabase functions deploy pulse-shop-fulfillment
 * Requires JWT (Authorization: Bearer <user session>).
 *
 * Secrets:
 *   APPLE_IAP_SHARED_SECRET     — App Store Connect app-specific shared secret
 *   GOOGLE_PLAY_PACKAGE_NAME  — Android applicationId
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON — Service account JSON (full string)
 *   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEYS, SUPABASE_SECRET_KEYS (auto; legacy anon/service_role still supported)
 */

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { err, jsonResponse, mapRpcException, ok, optionsResponse } from "../_shared/pulse-shop/responses.ts";
import { verifyAppleReceipt } from "../_shared/pulse-shop/validate-apple.ts";
import { verifyAppleTransactionJws } from "../_shared/pulse-shop/validate-apple-jws.ts";
import {
  isAllowedAndroidStoreProductId,
  playProductIdForGoogleVerify,
} from "../_shared/pulse-shop/android-product-aliases.ts";
import { verifyGoogleProduct, consumeGoogleConsumable } from "../_shared/pulse-shop/validate-google.ts";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "../_shared/supabaseEnv.ts";

type ShopItemRow = {
  id: string;
  type: string;
  slug: string;
  name: string;
  is_active: boolean;
  store_product_id_ios: string | null;
  store_product_id_android: string | null;
  spark_amount: number | null;
  spark_price: number | null;
  gift_contexts: string[] | null;
};

type RequestBody = {
  action: "fulfill_spark_pack" | "fulfill_border_self" | "fulfill_border_gift" | "send_creator_gift";
  shop_item_id: string;
  platform?: "ios" | "android";
  receipt?: {
    ios?: {
      /** StoreKit 2 transaction JWS (react-native-iap v14 `purchase.purchaseToken`). Preferred. */
      jws?: string;
      /** Legacy base64 app receipt (StoreKit 1). Fallback for older clients. */
      receipt_data_base64?: string;
    };
    android?: { purchase_token: string; product_id?: string };
  };
  border_gift?: {
    recipient_handle: string;
    note?: string | null;
  };
  creator_gift?: {
    creator_user_id: string;
    context_type: "live" | "post" | "profile";
    context_id: string | null;
    idempotency_key: string;
  };
};

function requireEnv(name: string): string | null {
  return Deno.env.get(name)?.trim() || null;
}

async function getAuthedUser(
  supabaseUrl: string,
  anonKey: string,
  authHeader: string | null,
): Promise<{ id: string; email?: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const sb = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user?.id) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

function expectedStoreProductId(item: ShopItemRow, platform: "ios" | "android"): string | null {
  if (platform === "ios") return item.store_product_id_ios?.trim() || null;
  return item.store_product_id_android?.trim() || null;
}

async function loadShopItem(admin: SupabaseClient, shopItemId: string): Promise<ShopItemRow | null> {
  const { data, error } = await admin
    .from("shop_items")
    .select(
      "id, type, slug, name, is_active, store_product_id_ios, store_product_id_android, spark_amount, spark_price, gift_contexts",
    )
    .eq("id", shopItemId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ShopItemRow;
}

async function ensurePurchaseReceiptAndFulfill(params: {
  admin: SupabaseClient;
  userSb: SupabaseClient;
  userId: string;
  platform: "ios" | "android";
  externalTransactionId: string;
  storeProductId: string;
  shopItemId: string;
  receiptPayload: Record<string, unknown>;
  fulfillRpc: (receiptId: string) => Promise<{ data: unknown; error: { message: string } | null }>;
}): Promise<
  ReturnType<typeof ok> | ReturnType<typeof err>
> {
  const { admin, userSb, userId, platform, externalTransactionId, storeProductId, shopItemId, receiptPayload, fulfillRpc } = params;

  const { data: existing, error: selErr } = await admin
    .from("purchase_receipts")
    .select("id, user_id, processed_at, shop_item_id, validation_status")
    .eq("platform", platform)
    .eq("external_transaction_id", externalTransactionId)
    .maybeSingle();

  if (selErr) {
    return err("FULFILLMENT_FAILED", selErr.message);
  }

  let receiptId: string;

  if (existing) {
    if (existing.user_id !== userId) {
      return err("NOT_ALLOWED", "This purchase is registered to another account.");
    }
    if (existing.shop_item_id && existing.shop_item_id !== shopItemId) {
      return err("INVALID_INPUT", "Receipt already used for a different shop item.");
    }
    receiptId = existing.id as string;
    if (existing.processed_at && existing.validation_status === "valid") {
      return ok({
        purchase_receipt_id: receiptId,
        already_fulfilled: true,
        message: "Purchase was already fulfilled.",
      });
    }
  } else {
    const { data: inserted, error: insErr } = await admin
      .from("purchase_receipts")
      .insert({
        user_id: userId,
        platform,
        store_product_id: storeProductId,
        external_transaction_id: externalTransactionId,
        shop_item_id: shopItemId,
        receipt_payload: receiptPayload,
        validation_status: "valid",
      })
      .select("id")
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        const { data: row } = await admin
          .from("purchase_receipts")
          .select("id, user_id, processed_at, shop_item_id, validation_status")
          .eq("platform", platform)
          .eq("external_transaction_id", externalTransactionId)
          .maybeSingle();
        if (!row || row.user_id !== userId) {
          return err("NOT_ALLOWED", "This purchase is registered to another account.");
        }
        if (row.shop_item_id && row.shop_item_id !== shopItemId) {
          return err("INVALID_INPUT", "Receipt already used for a different shop item.");
        }
        receiptId = row.id as string;
        if (row.processed_at && row.validation_status === "valid") {
          return ok({
            purchase_receipt_id: receiptId,
            already_fulfilled: true,
            message: "Purchase was already fulfilled.",
          });
        }
      } else {
        return err("FULFILLMENT_FAILED", insErr.message);
      }
    } else {
      receiptId = inserted!.id as string;
    }
  }

  await admin
    .from("purchase_receipts")
    .update({
      validation_status: "valid",
      shop_item_id: shopItemId,
      receipt_payload: receiptPayload,
    })
    .eq("id", receiptId)
    .is("processed_at", null);

  const { data: rpcData, error: rpcErr } = await fulfillRpc(receiptId);
  if (rpcErr) {
    const code = mapRpcException({ message: rpcErr.message });
    return err(code, rpcErr.message, { receipt_id: receiptId });
  }

  return ok({
    purchase_receipt_id: receiptId,
    already_fulfilled: false,
    fulfillment: rpcData,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);

  try {
  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const secretKey = getSupabaseSecretKey();

  if (!supabaseUrl || !publishableKey || !secretKey) {
    return jsonResponse(req, err("SERVER_MISCONFIGURED", "Missing Supabase environment variables."), 503);
  }

  const authHeader = req.headers.get("Authorization");
  const user = await getAuthedUser(supabaseUrl, publishableKey, authHeader);
  if (!user) {
    return jsonResponse(req, err("UNAUTHORIZED", "Valid Authorization Bearer token required."), 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse(req, err("INVALID_INPUT", "JSON body required."), 400);
  }

  const { action, shop_item_id: shopItemIdRaw } = body;
  if (!action || !shopItemIdRaw) {
    return jsonResponse(req, err("INVALID_INPUT", "action and shop_item_id are required."), 400);
  }

  const admin = createClient(supabaseUrl, secretKey);
  const userSb = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader! } },
  });

  const item = await loadShopItem(admin, shopItemIdRaw);
  if (!item) {
    return jsonResponse(req, err("INVALID_INPUT", "Unknown shop_item_id."), 400);
  }

  if (!item.is_active) {
    return jsonResponse(req, err("ITEM_INACTIVE", "This item is not available."), 422);
  }

  /* ─── IAP actions ─── */
  if (
    action === "fulfill_spark_pack" ||
    action === "fulfill_border_self" ||
    action === "fulfill_border_gift"
  ) {
    const platform = body.platform;
    if (platform !== "ios" && platform !== "android") {
      return jsonResponse(req, err("INVALID_INPUT", "platform must be ios or android."), 400);
    }

    if (action === "fulfill_spark_pack" && item.type !== "spark_pack") {
      return jsonResponse(req, err("ITEM_TYPE_MISMATCH", "shop_item must be a spark_pack."), 400);
    }
    if (
      (action === "fulfill_border_self" || action === "fulfill_border_gift") &&
      item.type !== "border"
    ) {
      return jsonResponse(req, err("ITEM_TYPE_MISMATCH", "shop_item must be a border."), 400);
    }
    if (action === "fulfill_border_gift") {
      const h = body.border_gift?.recipient_handle?.trim();
      if (!h) {
        return jsonResponse(req, err("INVALID_INPUT", "border_gift.recipient_handle is required."), 400);
      }
    }

    const expectedPid = expectedStoreProductId(item, platform);
    if (!expectedPid) {
      return jsonResponse(req, err("ITEM_INACTIVE", "Store product id not configured for this platform."), 422);
    }

    let storeProductId = expectedPid;
    let externalId: string;
    let receiptPayload: Record<string, unknown>;
    let androidPurchaseToken: string | null = null;

    if (platform === "ios") {
      const jws = body.receipt?.ios?.jws?.trim();
      const b64 = body.receipt?.ios?.receipt_data_base64?.trim();
      if (jws) {
        /** StoreKit 2 path (react-native-iap v14). No shared secret, no receipt refresh. */
        const bundleId = requireEnv("APPLE_BUNDLE_ID") || "com.pulseverse.app";
        const vr = await verifyAppleTransactionJws(jws, bundleId, expectedPid);
        if (!vr.ok) {
          return jsonResponse(req,
            err("INVALID_RECEIPT", vr.message, { apple_status: vr.status }),
            422,
          );
        }
        if (vr.purchase.productId !== expectedPid) {
          return jsonResponse(req, err("PRODUCT_MISMATCH", "Receipt product does not match catalog item."), 422);
        }
        storeProductId = vr.purchase.productId;
        externalId = vr.purchase.transactionId;
        receiptPayload = {
          source: "apple_jws_storekit2",
          transaction_id: vr.purchase.transactionId,
          product_id: vr.purchase.productId,
          environment: vr.purchase.environment,
        };
      } else if (b64) {
        /** Legacy StoreKit 1 app receipt path (older app builds). */
        const secret = requireEnv("APPLE_IAP_SHARED_SECRET");
        if (!secret) {
          return jsonResponse(req, err("STORE_NOT_CONFIGURED", "APPLE_IAP_SHARED_SECRET is not set."), 503);
        }
        const vr = await verifyAppleReceipt(b64, secret, expectedPid);
        if (!vr.ok) {
          return jsonResponse(req,
            err("INVALID_RECEIPT", vr.message, { apple_status: vr.status }),
            422,
          );
        }
        if (vr.purchase.productId !== expectedPid) {
          return jsonResponse(req, err("PRODUCT_MISMATCH", "Receipt product does not match catalog item."), 422);
        }
        storeProductId = vr.purchase.productId;
        externalId = vr.purchase.transactionId;
        receiptPayload = {
          source: "apple_verifyReceipt",
          transaction_id: vr.purchase.transactionId,
          product_id: vr.purchase.productId,
          raw_status: vr.purchase.rawStatus,
        };
      } else {
        return jsonResponse(req, err("INVALID_INPUT", "receipt.ios.jws or receipt.ios.receipt_data_base64 is required."), 400);
      }
    } else {
      const pkg = requireEnv("GOOGLE_PLAY_PACKAGE_NAME");
      const saJson = requireEnv("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
      if (!pkg || !saJson) {
        return jsonResponse(req,
          err("STORE_NOT_CONFIGURED", "Google Play env vars missing."),
          503,
        );
      }
      const token = body.receipt?.android?.purchase_token?.trim();
      if (!token) {
        return jsonResponse(req, err("INVALID_INPUT", "receipt.android.purchase_token is required."), 400);
      }
      androidPurchaseToken = token;
      const clientProductId = body.receipt?.android?.product_id?.trim() || expectedPid;
      if (!isAllowedAndroidStoreProductId(clientProductId, expectedPid)) {
        return jsonResponse(req, err("PRODUCT_MISMATCH", "product_id does not match catalog."), 422);
      }
      const playProductId = playProductIdForGoogleVerify(clientProductId, expectedPid);
      const vg = await verifyGoogleProduct(pkg, playProductId, token, saJson);
      if (!vg.ok) {
        return jsonResponse(req,
          err("STORE_REJECTED", vg.message, { http: vg.httpStatus }),
          422,
        );
      }
      if (!isAllowedAndroidStoreProductId(vg.purchase.productId, expectedPid)) {
        return jsonResponse(req, err("PRODUCT_MISMATCH", "Play purchase product mismatch."), 422);
      }
      storeProductId = vg.purchase.productId;
      externalId = vg.purchase.transactionId;
      receiptPayload = {
        source: "google_androidpublisher",
        order_id: vg.purchase.transactionId,
        product_id: vg.purchase.productId,
        catalog_product_id: expectedPid,
        purchase_token: token,
      };
    }

    if (action === "fulfill_spark_pack") {
      const result = await ensurePurchaseReceiptAndFulfill({
        admin,
        userSb,
        userId: user.id,
        platform,
        externalTransactionId: externalId,
        storeProductId,
        shopItemId: item.id,
        receiptPayload,
        fulfillRpc: (receiptId) =>
          userSb.rpc("economy_grant_sparks_from_valid_receipt", {
            p_purchase_receipt_id: receiptId,
          }),
      });
      if (
        platform === "android" &&
        androidPurchaseToken &&
        typeof result === "object" &&
        result !== null &&
        "ok" in result &&
        (result as { ok: boolean }).ok === true
      ) {
        const pkg = requireEnv("GOOGLE_PLAY_PACKAGE_NAME");
        const saJson = requireEnv("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
        if (pkg && saJson) {
          await consumeGoogleConsumable(pkg, storeProductId, androidPurchaseToken, saJson);
        }
      }
      return jsonResponse(req, result as never);
    }

    if (action === "fulfill_border_self") {
      const result = await ensurePurchaseReceiptAndFulfill({
        admin,
        userSb,
        userId: user.id,
        platform,
        externalTransactionId: externalId,
        storeProductId,
        shopItemId: item.id,
        receiptPayload,
        fulfillRpc: (receiptId) =>
          userSb.rpc("economy_grant_border_from_valid_receipt", {
            p_purchase_receipt_id: receiptId,
            p_shop_item_id: item.id,
          }),
      });
      return jsonResponse(req, result as never);
    }

    /* fulfill_border_gift */
    const note = body.border_gift?.note ?? null;
    const recipientHandle = body.border_gift!.recipient_handle;

    const result = await ensurePurchaseReceiptAndFulfill({
      admin,
      userSb,
      userId: user.id,
      platform,
      externalTransactionId: externalId,
      storeProductId,
      shopItemId: item.id,
      receiptPayload,
      fulfillRpc: (receiptId) =>
        userSb.rpc("economy_gift_border_from_valid_receipt", {
          p_sender_user_id: user.id,
          p_recipient_handle: recipientHandle,
          p_purchase_receipt_id: receiptId,
          p_shop_item_id: item.id,
          p_note: note,
        }),
    });
    return jsonResponse(req, result as never);
  }

  /* ─── send_creator_gift (Sparks only; no store receipt) ─── */
  if (action === "send_creator_gift") {
    if (item.type !== "gift") {
      return jsonResponse(req, err("ITEM_TYPE_MISMATCH", "shop_item must be a gift."), 400);
    }

    const cg = body.creator_gift;
    if (!cg?.creator_user_id?.trim() || !cg.context_type || cg.idempotency_key == null) {
      return jsonResponse(req,
        err("INVALID_INPUT", "creator_gift.creator_user_id, context_type, idempotency_key required."),
        400,
      );
    }
    if (cg.idempotency_key.trim().length < 8) {
      return jsonResponse(req, err("INVALID_INPUT", "idempotency_key must be at least 8 characters."), 400);
    }

    if (cg.creator_user_id === user.id) {
      return jsonResponse(req, err("SELF_GIFT_NOT_ALLOWED", "Cannot gift yourself."), 422);
    }

    const { data: creatorRow } = await admin.from("profiles").select("id").eq("id", cg.creator_user_id).maybeSingle();
    if (!creatorRow) {
      return jsonResponse(req, err("INVALID_RECIPIENT", "Creator profile not found."), 422);
    }

    const { data, error } = await userSb.rpc("economy_send_creator_gift", {
      p_creator_user_id: cg.creator_user_id,
      p_gift_item_id: item.id,
      p_context_type: cg.context_type,
      p_context_id: cg.context_id ?? null,
      p_idempotency_key: cg.idempotency_key.trim(),
    });

    if (error) {
      const code = mapRpcException({ message: error.message });
      return jsonResponse(req, err(code, error.message), 422);
    }

    return jsonResponse(req,
      ok({
        creator_gift_id: data,
        sparks_spent: item.spark_price,
      }),
    );
  }

  return jsonResponse(req, err("INVALID_INPUT", `Unknown action: ${action}`), 400);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[pulse-shop-fulfillment] unhandled:", detail);
    return jsonResponse(req, err("FULFILLMENT_FAILED", `Pulse Shop fulfillment error: ${detail}`), 422);
  }
});
