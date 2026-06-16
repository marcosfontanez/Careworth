import { WEBHOOK_MAX_ATTEMPTS } from "./types.ts";

/** Exponential backoff in minutes: 2, 4, 8, … capped at 60. */
export function computeNextAttemptIso(attemptsAfterFailure: number, nowMs = Date.now()): string {
  const exp = Math.max(1, attemptsAfterFailure);
  const minutes = Math.min(60, Math.pow(2, exp));
  return new Date(nowMs + minutes * 60_000).toISOString();
}

export function resolveStatusAfterFailure(attemptsAfterFailure: number): "pending" | "failed" {
  return attemptsAfterFailure >= WEBHOOK_MAX_ATTEMPTS ? "failed" : "pending";
}

export function shouldSkipOutboxRow(status: string): boolean {
  return status === "delivered" || status === "ignored";
}

export function isDeliverableStatus(status: string): boolean {
  return status === "pending" || status === "failed" || status === "retrying";
}
