import { assertEquals, assertMatch } from "jsr:@std/assert";

import { deliverOutboxEventToDestinations } from "./deliver.ts";
import { assertPayloadSize, buildDeliveryBody } from "./payload.ts";
import {
  computeNextAttemptIso,
  resolveStatusAfterFailure,
  shouldSkipOutboxRow,
} from "./retry.ts";
import { computeWebhookSignature, redactSecretFromLog } from "./signing.ts";
import type { WebhookDestination, WebhookOutboxRow } from "./types.ts";
import {
  destinationMatchesEventType,
  validateWebhookDestinationUrl,
} from "./validate.ts";

const baseRow: WebhookOutboxRow = {
  id: "11111111-1111-4111-8111-111111111111",
  event_type: "moderation.uphold",
  payload: { reportId: "abc", token: "secret-value" },
  status: "pending",
  attempts: 0,
  created_at: "2026-06-01T00:00:00.000Z",
  last_attempted_at: null,
  last_error: null,
  delivered_at: null,
  next_attempt_at: null,
  destination_id: null,
};

const dest: WebhookDestination = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Partner",
  url: "https://hooks.example.com/pulseverse",
  is_active: true,
  event_types: [],
  metadata: {},
};

Deno.test("validateWebhookDestinationUrl blocks private hosts", () => {
  assertEquals(validateWebhookDestinationUrl("https://hooks.example.com/x").ok, true);
  assertEquals(validateWebhookDestinationUrl("https://10.0.0.1/h").ok, false);
});

Deno.test("destinationMatchesEventType filters events", () => {
  assertEquals(destinationMatchesEventType({ event_types: [] }, "moderation.uphold"), true);
  assertEquals(destinationMatchesEventType({ event_types: ["live.admin_ended"] }, "moderation.uphold"), false);
});

Deno.test("buildDeliveryBody redacts sensitive keys", () => {
  const body = buildDeliveryBody(baseRow, 1, "2026-06-01T01:00:00.000Z");
  assertEquals(body.data.reportId, "abc");
  assertEquals("token" in body.data, false);
});

Deno.test("deliverOutboxEventToDestinations succeeds on 2xx", async () => {
  const result = await deliverOutboxEventToDestinations({
    row: baseRow,
    destinations: [dest],
    resolveSigningSecret: () => null,
    fetchImpl: async () => ({ status: 200, ok: true }),
  });
  assertEquals(result.delivered, true);
  assertEquals(result.finalStatus, "delivered");
});

Deno.test("deliverOutboxEventToDestinations retries on 500", async () => {
  const result = await deliverOutboxEventToDestinations({
    row: baseRow,
    destinations: [dest],
    resolveSigningSecret: () => null,
    fetchImpl: async () => ({ status: 500, ok: false }),
  });
  assertEquals(result.finalStatus, "pending");
  assertEquals(result.nextAttemptAt !== null, true);
});

Deno.test("deliverOutboxEventToDestinations fails at max attempts", async () => {
  const result = await deliverOutboxEventToDestinations({
    row: { ...baseRow, attempts: 4 },
    destinations: [dest],
    resolveSigningSecret: () => null,
    fetchImpl: async () => ({ status: 500, ok: false }),
  });
  assertEquals(result.finalStatus, "failed");
});

Deno.test("shouldSkipOutboxRow ignores terminal statuses", () => {
  assertEquals(shouldSkipOutboxRow("ignored"), true);
  assertEquals(shouldSkipOutboxRow("delivered"), true);
  assertEquals(shouldSkipOutboxRow("pending"), false);
});

Deno.test("computeWebhookSignature format", async () => {
  const sig = await computeWebhookSignature("test-secret", "1710000000", '{"id":"x"}');
  assertMatch(sig, /^t=1710000000,v1=[a-f0-9]+$/);
});

Deno.test("redactSecretFromLog hides bearer tokens", () => {
  assertMatch(redactSecretFromLog("Authorization: Bearer abc123"), /\[redacted\]/);
});

Deno.test("retry policy", () => {
  assertEquals(resolveStatusAfterFailure(5), "failed");
  assertEquals(resolveStatusAfterFailure(3), "pending");
  assertEquals(
    computeNextAttemptIso(2, Date.parse("2026-06-01T00:00:00.000Z")),
    "2026-06-01T00:04:00.000Z",
  );
});

Deno.test("assertPayloadSize rejects huge payloads", () => {
  const hugePayload: Record<string, unknown> = {};
  for (let i = 0; i < 8_000; i++) {
    hugePayload[`key_${i}`] = "value";
  }
  const huge = buildDeliveryBody(
    { ...baseRow, payload: hugePayload },
    1,
    "2026-06-01T00:00:00.000Z",
  );
  assertEquals(assertPayloadSize(huge).ok, false);
});
