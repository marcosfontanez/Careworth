/**
 * IAP refund / revocation webhook.
 *
 * Receives store refund notifications and revokes the matching entitlement via
 * the service-role-only RPC public.economy_revoke_purchase(). There is NO
 * client-trusted revocation path — this function authenticates each store
 * notification before acting.
 *
 * Deploy: npx supabase functions deploy iap-refund-webhook --no-verify-jwt
 *   (--no-verify-jwt because the stores call it without a Supabase user JWT;
 *    authenticity is enforced per-store below.)
 *
 * ── Android (Google Play Real-time Developer Notifications via Pub/Sub push) ──
 *   Authenticity: the Pub/Sub push subscription is configured to call
 *     https://<project>.functions.supabase.co/iap-refund-webhook?secret=<token>
 *   and we require ?secret== IAP_REFUND_WEBHOOK_SECRET (fail closed).
 *   Refund signal: developerNotification.voidedPurchaseNotification.orderId
 *   (orderId is what fulfillment stored as external_transaction_id).
 *
 * ── iOS (Apple App Store Server Notifications V2) ──
 *   Authenticity: Apple cannot send our shared secret, so we re-confirm the
 *   transaction against the App Store Server API over authenticated TLS using
 *   our signed JWT (APPLE_ASSN_* secrets). We only revoke when Apple's API
 *   reports a revocationDate. If the Apple API key is not configured we DO NOT
 *   revoke (fail safe) and log it — iOS refund auto-revocation stays a
 *   documented external-setup item.
 *
 * Secrets:
 *   IAP_REFUND_WEBHOOK_SECRET     — shared token for the Google Pub/Sub push URL (required)
 *   APPLE_ASSN_ISSUER_ID          — App Store Connect API issuer id (iOS only)
 *   APPLE_ASSN_KEY_ID             — App Store Connect API key id (iOS only)
 *   APPLE_ASSN_PRIVATE_KEY        — App Store Connect API .p8 private key, full PEM (iOS only)
 *   APPLE_ASSN_BUNDLE_ID          — app bundle id (iOS only)
 *   SUPABASE_URL, SUPABASE_SECRET_KEYS (or legacy SUPABASE_SERVICE_ROLE_KEY)
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { getSupabaseSecretKey, getSupabaseUrl } from "../_shared/supabaseEnv.ts";

function env(name: string): string | null {
  return Deno.env.get(name)?.trim() || null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function b64UrlToString(seg: string): string {
  const pad = seg.length % 4 === 0 ? "" : "=".repeat(4 - (seg.length % 4));
  const b64 = seg.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return atob(b64);
}

function decodeJwsPayload<T = Record<string, unknown>>(jws: string): T | null {
  try {
    const parts = jws.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(b64UrlToString(parts[1])) as T;
  } catch {
    return null;
  }
}

/** Sign an ES256 App Store Connect API JWT, or null if creds are missing. */
async function signAppleApiJwt(): Promise<string | null> {
  const keyId = env("APPLE_ASSN_KEY_ID");
  const issuerId = env("APPLE_ASSN_ISSUER_ID");
  const bundleId = env("APPLE_ASSN_BUNDLE_ID");
  const pem = env("APPLE_ASSN_PRIVATE_KEY");
  if (!keyId || !issuerId || !bundleId || !pem) return null;

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 60 * 20,
    aud: "appstoreconnect-v1",
    bid: bundleId,
  };
  const signingInput = `${enc(header)}.${enc(payload)}`;

  const der = Uint8Array.from(
    atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(signingInput),
    ),
  );
  const sigB64 = btoa(String.fromCharCode(...sig))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${signingInput}.${sigB64}`;
}

/**
 * Authoritatively confirm an Apple transaction is revoked via the App Store
 * Server API (TLS-authenticated). Returns true only when Apple reports a
 * revocationDate. Returns null when Apple API creds are not configured.
 */
async function appleTransactionIsRevoked(
  transactionId: string,
  environment: string,
): Promise<boolean | null> {
  const jwt = await signAppleApiJwt();
  if (!jwt) return null;

  const base = environment === "Sandbox"
    ? "https://api.storekit-sandbox.itunes.apple.com"
    : "https://api.storekit.itunes.apple.com";

  const res = await fetch(`${base}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    console.warn(`[iap-refund] Apple transaction lookup failed: ${res.status}`);
    return false;
  }
  const body = (await res.json()) as { signedTransactionInfo?: string };
  if (!body.signedTransactionInfo) return false;
  const info = decodeJwsPayload<{ revocationDate?: number }>(body.signedTransactionInfo);
  return !!info?.revocationDate;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const supabaseUrl = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  if (!supabaseUrl || !secretKey) {
    return jsonResponse({ error: "server_misconfigured" }, 503);
  }
  const admin = createClient(supabaseUrl, secretKey);

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const revoke = async (platform: "ios" | "android", externalId: string, reason: string) => {
    const { data, error } = await admin.rpc("economy_revoke_purchase", {
      p_platform: platform,
      p_external_transaction_id: externalId,
      p_reason: reason,
    });
    if (error) {
      console.error(`[iap-refund] revoke failed (${platform} ${externalId}):`, error.message);
      return false;
    }
    console.log(`[iap-refund] revoke ${platform} ${externalId}:`, JSON.stringify(data));
    return true;
  };

  // ── Google Play RTDN (Pub/Sub push envelope) ──
  const message = (raw as { message?: { data?: string } }).message;
  if (message && typeof message.data === "string") {
    const expected = env("IAP_REFUND_WEBHOOK_SECRET");
    if (!expected) {
      console.error("[iap-refund] IAP_REFUND_WEBHOOK_SECRET not set — refusing Google RTDN.");
      return jsonResponse({ error: "webhook_secret_not_configured" }, 503);
    }
    const provided = new URL(req.url).searchParams.get("secret");
    if (provided !== expected) {
      return jsonResponse({ error: "forbidden" }, 401);
    }

    let notif: {
      voidedPurchaseNotification?: { orderId?: string; purchaseToken?: string };
    };
    try {
      notif = JSON.parse(atob(message.data));
    } catch {
      return jsonResponse({ error: "invalid_pubsub_payload" }, 400);
    }

    const orderId = notif.voidedPurchaseNotification?.orderId?.trim();
    if (orderId) {
      await revoke("android", orderId, "google_voided_purchase");
    }
    // Always ack so Pub/Sub stops retrying a notification we've accepted.
    return jsonResponse({ ok: true });
  }

  // ── Apple App Store Server Notifications V2 ──
  const signedPayload = (raw as { signedPayload?: string }).signedPayload;
  if (typeof signedPayload === "string") {
    const payload = decodeJwsPayload<{
      notificationType?: string;
      subtype?: string;
      data?: { environment?: string; signedTransactionInfo?: string };
    }>(signedPayload);

    if (!payload) return jsonResponse({ error: "invalid_signed_payload" }, 400);

    const type = payload.notificationType;
    if (type !== "REFUND" && type !== "REVOKE") {
      // Not a refund/revocation — ack and ignore (consumption requests, renewals, etc.)
      return jsonResponse({ ok: true, ignored: type });
    }

    const txInfo = payload.data?.signedTransactionInfo
      ? decodeJwsPayload<{ transactionId?: string }>(payload.data.signedTransactionInfo)
      : null;
    const transactionId = txInfo?.transactionId?.trim();
    if (!transactionId) return jsonResponse({ ok: true, note: "no_transaction_id" });

    const confirmed = await appleTransactionIsRevoked(
      transactionId,
      payload.data?.environment ?? "Production",
    );
    if (confirmed === null) {
      // Apple Server API key not configured — do NOT act on the unverified
      // notification. Documented external-setup item; ack so Apple stops retrying.
      console.warn("[iap-refund] Apple ASSN received but APPLE_ASSN_* not configured — skipping revoke.");
      return jsonResponse({ ok: true, note: "apple_verification_unconfigured" });
    }
    if (confirmed) {
      await revoke("ios", transactionId, `apple_${type.toLowerCase()}`);
    }
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "unrecognized_notification" }, 400);
});
