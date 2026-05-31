/**
 * App Store receipt verification (legacy verifyReceipt).
 * Secrets: APPLE_IAP_SHARED_SECRET (App-Specific Shared Secret from App Store Connect)
 */

export type AppleValidatedPurchase = {
  platform: "ios";
  productId: string;
  transactionId: string;
  rawStatus: number;
};

const PROD = "https://buy.itunes.apple.com/verifyReceipt";
const SANDBOX = "https://sandbox.itunes.apple.com/verifyReceipt";

/**
 * Apple's verifyReceipt endpoints (especially sandbox) occasionally stall. We
 * bound each call so the Edge Function returns a clean error instead of holding
 * the client's "Crediting Sparks…" spinner open until the platform kills it.
 */
const APPLE_FETCH_TIMEOUT_MS = 12_000;

async function postVerifyReceipt(
  url: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), APPLE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return (await res.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(t);
  }
}

export async function verifyAppleReceipt(
  receiptBase64: string,
  sharedSecret: string,
  expectedProductId?: string,
): Promise<{ ok: true; purchase: AppleValidatedPurchase } | { ok: false; status: number; message: string }> {
  const body = {
    "receipt-data": receiptBase64,
    password: sharedSecret,
    "exclude-old-transactions": true,
  };

  let json: Record<string, unknown>;
  try {
    json = await postVerifyReceipt(PROD, body);
  } catch (e) {
    const aborted = (e as { name?: string })?.name === "AbortError";
    return {
      ok: false,
      status: 21005,
      message: aborted
        ? "App Store receipt server timed out (production)."
        : `App Store receipt request failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  let status = Number(json.status ?? -1);

  if (status === 21007) {
    try {
      json = await postVerifyReceipt(SANDBOX, body);
    } catch (e) {
      const aborted = (e as { name?: string })?.name === "AbortError";
      return {
        ok: false,
        status: 21005,
        message: aborted
          ? "App Store receipt server timed out (sandbox)."
          : `App Store sandbox receipt request failed: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
    status = Number(json.status ?? -1);
  }

  if (status !== 0) {
    return { ok: false, status, message: appleStatusMessage(status) };
  }

  const receipt = json.receipt as Record<string, unknown> | undefined;
  const inApp = (json.latest_receipt_info as unknown[]) ??
    (receipt?.in_app as unknown[]) ??
    [];

  if (!Array.isArray(inApp) || inApp.length === 0) {
    return { ok: false, status: -2, message: "No in_app transactions in receipt" };
  }

  const rows = inApp as Record<string, unknown>[];
  let filtered = rows;
  if (expectedProductId) {
    filtered = rows.filter((r) => String(r.product_id ?? r.productId ?? "") === expectedProductId);
    if (filtered.length === 0) {
      return {
        ok: false,
        status: -4,
        message: `No transaction for product_id ${expectedProductId} in receipt`,
      };
    }
  }
  filtered.sort((a, b) => {
    const da = Number(a.purchase_date_ms ?? a.original_purchase_date_ms ?? 0);
    const db = Number(b.purchase_date_ms ?? b.original_purchase_date_ms ?? 0);
    return db - da;
  });

  const latest = filtered[0];
  const productId = String(latest.product_id ?? latest.productId ?? "");
  const transactionId = String(latest.transaction_id ?? latest.transactionId ?? "");

  if (!productId || !transactionId) {
    return { ok: false, status: -3, message: "Missing product_id or transaction_id on transaction" };
  }

  return {
    ok: true,
    purchase: {
      platform: "ios",
      productId,
      transactionId,
      rawStatus: status,
    },
  };
}

function appleStatusMessage(status: number): string {
  const map: Record<number, string> = {
    21000: "App Store could not read the JSON.",
    21002: "Receipt data is malformed or missing.",
    21003: "Receipt could not be authenticated.",
    21004: "Shared secret mismatch.",
    21005: "Receipt server unavailable.",
    21006: "Receipt is valid but subscription expired (not applicable for non-subscription).",
    21007: "Sandbox receipt sent to production.",
    21008: "Production receipt sent to sandbox.",
    21010: "Receipt could not be authorized.",
  };
  return map[status] ?? `Apple verifyReceipt status ${status}`;
}
