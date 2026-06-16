import { WEBHOOK_REQUEST_TIMEOUT_MS } from "./types.ts";
import type { DeliveryAttemptResult, WebhookDestination } from "./types.ts";
import { assertPayloadSize, buildDeliveryBody } from "./payload.ts";
import { buildSignedHeaders, redactSecretFromLog } from "./signing.ts";
import {
  destinationMatchesEventType,
  readAllowInsecureHttp,
  readSigningSecretEnvKey,
  truncateError,
  validateWebhookDestinationUrl,
} from "./validate.ts";
import type { WebhookOutboxRow } from "./types.ts";
import {
  computeNextAttemptIso,
  resolveStatusAfterFailure,
} from "./retry.ts";

export type DeliverHook = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ status: number; ok: boolean }>;

export async function deliverOutboxEventToDestinations(args: {
  row: WebhookOutboxRow;
  destinations: WebhookDestination[];
  resolveSigningSecret: (envKey: string | null) => string | null;
  fetchImpl?: DeliverHook;
  nowIso?: string;
}): Promise<{
  delivered: boolean;
  destinationId: string | null;
  attemptsAfter: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  finalStatus: "delivered" | "pending" | "failed";
  results: DeliveryAttemptResult[];
}> {
  const nowIso = args.nowIso ?? new Date().toISOString();
  const attemptNumber = (args.row.attempts ?? 0) + 1;
  const matching = args.destinations.filter(
    (d) => d.is_active && destinationMatchesEventType(d, args.row.event_type),
  );

  if (!matching.length) {
    const attemptsAfter = attemptNumber;
    const finalStatus = resolveStatusAfterFailure(attemptsAfter);
    return {
      delivered: false,
      destinationId: null,
      attemptsAfter,
      lastError: "No active webhook destination matches this event type.",
      nextAttemptAt: finalStatus === "pending" ? computeNextAttemptIso(attemptsAfter) : null,
      finalStatus,
      results: [],
    };
  }

  const bodyObj = buildDeliveryBody(args.row, attemptNumber, nowIso);
  const sized = assertPayloadSize(bodyObj);
  if (!sized.ok) {
    return {
      delivered: false,
      destinationId: null,
      attemptsAfter: attemptNumber,
      lastError: sized.error,
      nextAttemptAt: null,
      finalStatus: "failed",
      results: [],
    };
  }

  const fetchImpl = args.fetchImpl ?? defaultFetch;
  const results: DeliveryAttemptResult[] = [];
  let allOk = true;
  let combinedError = "";

  for (const dest of matching) {
    const allowInsecure = readAllowInsecureHttp(dest.metadata ?? {});
    const validated = validateWebhookDestinationUrl(dest.url, allowInsecure);
    if (!validated.ok) {
      allOk = false;
      combinedError = validated.error;
      results.push({
        ok: false,
        statusCode: null,
        error: validated.error,
        destinationId: dest.id,
        destinationName: dest.name,
      });
      continue;
    }

    const secretEnvKey = readSigningSecretEnvKey(dest.metadata ?? {});
    const secret = args.resolveSigningSecret(secretEnvKey);
    const headers = await buildSignedHeaders(secret, sized.json, nowIso, args.row.id);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBHOOK_REQUEST_TIMEOUT_MS);

    try {
      const res = await fetchImpl(validated.url.toString(), {
        method: "POST",
        headers,
        body: sized.json,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        results.push({
          ok: true,
          statusCode: res.status,
          error: null,
          destinationId: dest.id,
          destinationName: dest.name,
        });
      } else {
        allOk = false;
        const err = truncateError(`HTTP ${res.status} from ${dest.name}`);
        combinedError = combinedError ? `${combinedError}; ${err}` : err;
        results.push({
          ok: false,
          statusCode: res.status,
          error: err,
          destinationId: dest.id,
          destinationName: dest.name,
        });
      }
    } catch (e) {
      clearTimeout(timer);
      allOk = false;
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? `Timeout after ${WEBHOOK_REQUEST_TIMEOUT_MS}ms (${dest.name})`
          : truncateError(e instanceof Error ? e.message : String(e));
      combinedError = combinedError ? `${combinedError}; ${msg}` : redactSecretFromLog(msg);
      results.push({
        ok: false,
        statusCode: null,
        error: msg,
        destinationId: dest.id,
        destinationName: dest.name,
      });
    }
  }

  if (allOk) {
    return {
      delivered: true,
      destinationId: matching.length === 1 ? matching[0]!.id : matching[0]!.id,
      attemptsAfter: attemptNumber,
      lastError: null,
      nextAttemptAt: null,
      finalStatus: "delivered",
      results,
    };
  }

  const attemptsAfter = attemptNumber;
  const finalStatus = resolveStatusAfterFailure(attemptsAfter);
  return {
    delivered: false,
    destinationId: null,
    attemptsAfter,
    lastError: truncateError(combinedError || "Delivery failed."),
    nextAttemptAt: finalStatus === "pending" ? computeNextAttemptIso(attemptsAfter) : null,
    finalStatus,
    results,
  };
}

async function defaultFetch(
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
): Promise<{ status: number; ok: boolean }> {
  const res = await fetch(url, init);
  return { status: res.status, ok: res.ok };
}
