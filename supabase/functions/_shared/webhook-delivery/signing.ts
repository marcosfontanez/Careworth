import { WEBHOOK_SIGNATURE_HEADER } from "./types.ts";

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function computeWebhookSignature(
  secret: string,
  timestamp: string,
  body: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  return `t=${timestamp},v1=${bytesToHex(signed)}`;
}

export async function buildSignedHeaders(
  secret: string | null,
  body: string,
  timestamp: string,
  eventId: string,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "PulseVerse-Webhook-Delivery/1.0",
    "X-Webhook-Id": eventId,
    "X-Webhook-Timestamp": timestamp,
  };
  if (secret) {
    headers[WEBHOOK_SIGNATURE_HEADER] = await computeWebhookSignature(secret, timestamp, body);
  }
  return headers;
}

export function redactSecretFromLog(value: string): string {
  return value.replace(/v1=[a-f0-9]+/gi, "v1=[redacted]").replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}
