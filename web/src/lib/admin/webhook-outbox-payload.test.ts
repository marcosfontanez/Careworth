import { describe, expect, it } from "vitest";

import { redactWebhookPayload } from "./webhook-outbox-payload";

describe("redactWebhookPayload", () => {
  it("redacts sensitive keys", () => {
    const out = redactWebhookPayload({
      reportId: "abc-123",
      token: "secret-value",
      authorization: "Bearer xyz",
      nested: { api_key: "k" },
    });
    expect(out.reportId).toBe("abc-123");
    expect(out.token).toBe("[redacted]");
    expect(out.authorization).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).api_key).toBe("[redacted]");
  });
});
