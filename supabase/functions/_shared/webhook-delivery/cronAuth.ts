// Cron auth for deliver-webhook-outbox (mirrors circle-prompts/cronAuth.ts).

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function checkWebhookDeliveryCronAuth(req: Request): CronAuthResult {
  const secret =
    Deno.env.get("WEBHOOK_DELIVERY_CRON_SECRET")?.trim() ||
    Deno.env.get("CRON_SECRET")?.trim() ||
    Deno.env.get("DISPATCH_SCHEDULED_SECRET")?.trim() ||
    "";

  if (!secret) {
    return {
      ok: false,
      status: 503,
      error:
        "No cron secret configured. Set WEBHOOK_DELIVERY_CRON_SECRET and send it as the x-cron-secret header.",
    };
  }

  const provided = req.headers.get("x-cron-secret")?.trim() ?? "";
  if (provided !== secret) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  return { ok: true };
}
