export const WEBHOOK_MAX_ATTEMPTS = 5;
export const WEBHOOK_REQUEST_TIMEOUT_MS = 15_000;
export const WEBHOOK_MAX_PAYLOAD_BYTES = 65_536;
export const WEBHOOK_SIGNATURE_HEADER = "X-Webhook-Signature";

export type WebhookDestination = {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  event_types: string[];
  metadata: Record<string, unknown>;
};

export type WebhookOutboxRow = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  created_at: string;
  last_attempted_at: string | null;
  last_error: string | null;
  delivered_at: string | null;
  next_attempt_at: string | null;
  destination_id: string | null;
};

export type DeliveryBody = {
  id: string;
  event_type: string;
  created_at: string;
  attempt: number;
  timestamp: string;
  data: Record<string, unknown>;
};

export type DeliveryAttemptResult = {
  ok: boolean;
  statusCode: number | null;
  error: string | null;
  destinationId: string;
  destinationName: string;
};

export type WorkerRunSummary = {
  disabled?: boolean;
  reason?: string;
  claimed?: number;
  delivered?: number;
  failed?: number;
  skipped?: number;
  no_destinations?: boolean;
  active_destinations?: number;
};
