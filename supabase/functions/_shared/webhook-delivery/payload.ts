import { WEBHOOK_MAX_PAYLOAD_BYTES } from "./types.ts";
import type { DeliveryBody, WebhookOutboxRow } from "./types.ts";

export function buildDeliveryBody(row: WebhookOutboxRow, attemptNumber: number, nowIso: string): DeliveryBody {
  return {
    id: row.id,
    event_type: row.event_type,
    created_at: row.created_at,
    attempt: attemptNumber,
    timestamp: nowIso,
    data: sanitizePayloadData(row.payload ?? {}),
  };
}

function sanitizePayloadData(payload: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 6) return { _truncated: true };
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (/^(token|secret|password|authorization|api_key|apikey|signing_key|private_key|bearer|cookie)$/i.test(key)) {
      continue;
    }
    if (typeof value === "string" && value.length > 2_000) {
      out[key] = `${value.slice(0, 2_000)}…`;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizePayloadData(value as Record<string, unknown>, depth + 1);
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 50);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function assertPayloadSize(body: DeliveryBody): { ok: true; json: string } | { ok: false; error: string } {
  const json = JSON.stringify(body);
  const bytes = new TextEncoder().encode(json).byteLength;
  if (bytes > WEBHOOK_MAX_PAYLOAD_BYTES) {
    return { ok: false, error: `Payload too large (${bytes} bytes).` };
  }
  return { ok: true, json };
}
