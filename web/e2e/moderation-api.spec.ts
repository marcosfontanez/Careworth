import { expect, test } from "@playwright/test";

test.describe("Moderation API smoke", () => {
  test("rejects invalid JSON", async ({ request }) => {
    const res = await request.post("/api/admin/moderation", {
      data: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  test("rejects missing reportId", async ({ request }) => {
    const res = await request.post("/api/admin/moderation", {
      data: JSON.stringify({ action: "dismiss" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("unauthenticated dismiss returns error payload", async ({ request }) => {
    const res = await request.post("/api/admin/moderation", {
      data: JSON.stringify({
        action: "dismiss",
        reportId: "00000000-0000-0000-0000-000000000001",
      }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe("string");
  });
});
