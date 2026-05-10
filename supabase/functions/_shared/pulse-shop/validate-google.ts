/**
 * Google Play in-app product validation (purchases.products.get).
 * Secret: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON — full JSON string of a service account with
 *         "Google Play Android Developer" / Android Publisher API access.
 * Secret: GOOGLE_PLAY_PACKAGE_NAME — applicationId (e.g. com.pulseverse.app)
 */

import { SignJWT, importPKCS8 } from "npm:jose@5";

export type GoogleValidatedPurchase = {
  platform: "android";
  productId: string;
  transactionId: string;
  purchaseState: number;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

async function getGoogleAccessToken(sa: ServiceAccount): Promise<string | null> {
  const pk = sa.private_key.replace(/\\n/g, "\n").trim();
  const key = await importPKCS8(pk, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/androidpublisher",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const j = (await res.json()) as Record<string, unknown>;
  const token = j.access_token;
  return typeof token === "string" ? token : null;
}

/** purchaseState: 0 Purchased, 1 Canceled, 2 Pending */
export async function verifyGoogleProduct(
  packageName: string,
  productId: string,
  purchaseToken: string,
  serviceAccountJson: string,
): Promise<
  { ok: true; purchase: GoogleValidatedPurchase } | { ok: false; message: string; httpStatus?: number }
> {
  let sa: ServiceAccount;
  try {
    sa = JSON.parse(serviceAccountJson) as ServiceAccount;
  } catch {
    return { ok: false, message: "Invalid GOOGLE_PLAY_SERVICE_ACCOUNT_JSON" };
  }
  if (!sa.client_email || !sa.private_key) {
    return { ok: false, message: "Service account JSON missing client_email or private_key" };
  }

  const access = await getGoogleAccessToken(sa);
  if (!access) {
    return { ok: false, message: "Failed to obtain Google OAuth access token" };
  }

  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}` +
    `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${access}` },
  });

  const j = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const e = j.error;
    const message =
      typeof e === "object" && e !== null && "message" in e
        ? String((e as { message?: string }).message)
        : String(e ?? res.statusText);
    return {
      ok: false,
      message,
      httpStatus: res.status,
    };
  }

  const purchaseState = Number(j.purchaseState ?? -1);
  if (purchaseState !== 0) {
    return { ok: false, message: `Purchase not active (purchaseState=${purchaseState})` };
  }

  const orderId = String(j.orderId ?? "");
  if (!orderId) {
    return { ok: false, message: "Missing orderId from Google Play response" };
  }

  return {
    ok: true,
    purchase: {
      platform: "android",
      productId,
      transactionId: orderId,
      purchaseState,
    },
  };
}
