import { createHash, randomBytes } from "node:crypto";

function pepper(): string {
  return process.env.PARTNER_API_KEY_PEPPER ?? "development-pepper-change-in-production";
}

export function hashPartnerApiKey(raw: string): string {
  return createHash("sha256").update(raw + pepper(), "utf8").digest("hex");
}

/** Single-use plaintext shown to staff once; only hash is persisted. */
export function generatePartnerApiSecret(): string {
  return `pv_partner_${randomBytes(24).toString("base64url")}`;
}

export function partnerKeyPrefixFromSecret(secret: string): string {
  return secret.slice(0, 20);
}
