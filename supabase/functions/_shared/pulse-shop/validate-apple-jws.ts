/**
 * App Store StoreKit 2 transaction verification (JWS) — Deno / Web Crypto native.
 *
 * react-native-iap v14 (StoreKit 2) returns each purchase's transaction as a
 * signed JWS string (`purchase.purchaseToken` on iOS). This is the modern
 * replacement for the legacy base64 app receipt + `verifyReceipt` endpoint.
 *
 * Why not `@apple/app-store-server-library`?
 *   That library verifies the JWS signature through Node's `jsonwebtoken` /
 *   `node:crypto` code path, which does NOT compute ES256 correctly on the
 *   Supabase Edge (Deno) runtime — every valid Apple transaction came back as
 *   `VERIFICATION_FAILURE`. Here we verify the signature with `jose` (Web Crypto,
 *   fully supported on Deno) and establish trust with the Apple cert chain
 *   directly:
 *     1. Verify each x5c link is signed by the next certificate (real chain).
 *     2. Pin the chain root to a known Apple Root CA.
 *     3. Verify the JWS ES256 signature against the leaf certificate.
 *     4. Check the decoded bundleId / productId.
 *
 * No client-side receipt refresh — which is what caused the repeated
 * "Sign in to Apple Account" loop during purchase.
 *
 * Optional secrets:
 *   APPLE_BUNDLE_ID — app bundle id (defaults to com.pulseverse.app).
 */

import { Buffer } from "node:buffer";
import * as jose from "npm:jose@5";
import * as x509 from "npm:@peculiar/x509@1";

/**
 * `@peculiar/x509` is provider-agnostic; point it at Deno's global Web Crypto so
 * certificate signature checks run on the same engine as `jose` (the Node
 * `node:crypto` X509 path is not implemented on the Supabase Edge runtime).
 */
x509.cryptoProvider.set(crypto as unknown as Crypto);

export type AppleJwsValidatedPurchase = {
  platform: "ios";
  productId: string;
  transactionId: string;
  environment: string;
};

function describeError(e: unknown): string {
  if (e && typeof e === "object") {
    const anyE = e as { message?: unknown; name?: unknown };
    if (typeof anyE.message === "string" && anyE.message.trim()) return anyE.message.trim();
    if (typeof anyE.name === "string" && anyE.name.trim()) return anyE.name.trim();
  }
  const s = String(e);
  return s && s !== "[object Object]" ? s : "unknown error";
}

/** Apple root certificates (DER) — fetched once and cached for the function's lifetime. */
let cachedRootCerts: Buffer[] | null = null;

const APPLE_ROOT_CERT_URLS = [
  "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G2.cer",
  "https://www.apple.com/appleca/AppleIncRootCertificate.cer",
];

async function loadAppleRootCerts(): Promise<Buffer[]> {
  if (cachedRootCerts && cachedRootCerts.length > 0) return cachedRootCerts;
  const out: Buffer[] = [];
  for (const url of APPLE_ROOT_CERT_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error("[apple-jws] root cert fetch non-200", { url, status: res.status });
        continue;
      }
      const buf = Buffer.from(new Uint8Array(await res.arrayBuffer()));
      /** A real DER certificate is an ASN.1 SEQUENCE — first byte 0x30. If Apple
       *  (or a proxy) returns an HTML error page, skip it. */
      if (buf.byteLength > 0 && buf[0] === 0x30) {
        out.push(buf);
      } else {
        console.error("[apple-jws] root cert not DER", { url, bytes: buf.byteLength, firstByte: buf[0] });
      }
    } catch (e) {
      console.error("[apple-jws] root cert fetch threw", { url, detail: describeError(e) });
    }
  }
  if (out.length > 0) cachedRootCerts = out;
  return out;
}

function derB64ToPem(b64: string): string {
  const body = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----\n`;
}

/**
 * Establish that the leaf certificate chains up to a trusted Apple root.
 *   - Every link must be signed by the next certificate.
 *   - The top of the chain must be (or be signed by) a pinned Apple root.
 * This is the security-critical step: without it, a forged leaf could sign
 * an arbitrary transaction payload.
 */
async function certSignedBy(child: x509.X509Certificate, issuer: x509.X509Certificate): Promise<boolean> {
  try {
    const issuerKey = await issuer.publicKey.export(crypto as unknown as Crypto);
    return await child.verify({ publicKey: issuerKey, signatureOnly: true }, crypto as unknown as Crypto);
  } catch {
    return false;
  }
}

async function verifyCertificateChain(x5c: string[]): Promise<{ ok: true; leafPem: string } | { ok: false; message: string }> {
  let certs: x509.X509Certificate[];
  try {
    certs = x5c.map((b) => new x509.X509Certificate(Buffer.from(b, "base64")));
  } catch (e) {
    return { ok: false, message: `Could not parse certificate chain: ${describeError(e)}` };
  }
  if (certs.length === 0) return { ok: false, message: "Empty certificate chain." };

  for (let i = 0; i < certs.length - 1; i++) {
    const signed = await certSignedBy(certs[i], certs[i + 1]);
    if (!signed) return { ok: false, message: `Certificate chain link ${i} not signed by its issuer.` };
  }

  const roots = await loadAppleRootCerts();
  if (roots.length === 0) {
    return { ok: false, message: "Could not load Apple root certificates for pinning." };
  }
  const top = certs[certs.length - 1];
  const topDer = Buffer.from(x5c[x5c.length - 1], "base64");

  let trusted = false;
  for (const r of roots) {
    if (r.equals(topDer)) { trusted = true; break; } // chain already ends at the Apple root
    try {
      const rootCert = new x509.X509Certificate(r);
      if (await certSignedBy(top, rootCert)) { trusted = true; break; } // top signed by Apple root
    } catch {
      /* try next root */
    }
  }
  if (!trusted) return { ok: false, message: "Certificate chain does not root in a trusted Apple CA." };

  return { ok: true, leafPem: derB64ToPem(x5c[0]) };
}

/**
 * Verify a StoreKit 2 transaction JWS and return its product + transaction id.
 */
export async function verifyAppleTransactionJws(
  jws: string,
  bundleId: string,
  expectedProductId?: string,
): Promise<
  | { ok: true; purchase: AppleJwsValidatedPurchase }
  | { ok: false; status: number; message: string }
> {
  // 1. Read the protected header to get the x5c certificate chain.
  let header: jose.ProtectedHeaderParameters;
  try {
    header = jose.decodeProtectedHeader(jws);
  } catch (e) {
    return { ok: false, status: -1, message: `Malformed transaction token header: ${describeError(e)}` };
  }
  const x5c = Array.isArray(header.x5c) ? (header.x5c as string[]) : [];
  if (x5c.length === 0) {
    return { ok: false, status: -2, message: "Transaction token is missing its certificate chain (x5c)." };
  }

  // 2. Establish Apple trust via the certificate chain + root pin.
  const chain = await verifyCertificateChain(x5c);
  if (!chain.ok) {
    console.error("[apple-jws] chain trust failed", { detail: chain.message });
    return { ok: false, status: -3, message: chain.message };
  }

  // 3. Verify the JWS ES256 signature against the leaf public key (Web Crypto / jose).
  let payload: Record<string, unknown>;
  try {
    const leafKey = await jose.importX509(chain.leafPem, "ES256");
    const verified = await jose.compactVerify(jws, leafKey);
    payload = JSON.parse(new TextDecoder().decode(verified.payload)) as Record<string, unknown>;
  } catch (e) {
    console.error("[apple-jws] signature verification failed", { detail: describeError(e) });
    return { ok: false, status: -5, message: `Signature verification failed: ${describeError(e)}` };
  }

  // 4. Validate the decoded transaction fields.
  const productId = String(payload.productId ?? "");
  const transactionId = String(payload.transactionId ?? payload.originalTransactionId ?? "");
  const payloadBundleId = String(payload.bundleId ?? "");
  const environment = String(payload.environment ?? "");

  if (!productId || !transactionId) {
    return { ok: false, status: -6, message: "Verified transaction is missing productId or transactionId." };
  }
  if (payloadBundleId && bundleId && payloadBundleId !== bundleId) {
    return {
      ok: false,
      status: -7,
      message: `Transaction bundle id ${payloadBundleId} does not match expected ${bundleId}.`,
    };
  }
  if (expectedProductId && productId !== expectedProductId) {
    return {
      ok: false,
      status: -4,
      message: `Transaction product ${productId} does not match expected ${expectedProductId}.`,
    };
  }

  return {
    ok: true,
    purchase: {
      platform: "ios",
      productId,
      transactionId,
      environment: environment || "unknown",
    },
  };
}
