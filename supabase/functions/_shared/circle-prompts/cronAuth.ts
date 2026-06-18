// Shared authorization for the Circle weekly-prompt cron Edge Functions.
//
// Mirrors the repo's existing scheduled-job pattern (dispatch-scheduled): a
// shared secret in the function env, sent by the caller in the `x-cron-secret`
// header. We accept several env names so deployments can use whichever they
// already have configured:
//   1. CIRCLE_PROMPTS_CRON_SECRET  (preferred, dedicated)
//   2. CRON_SECRET                 (generic, per the task spec)
//   3. DISPATCH_SCHEDULED_SECRET   (reuse the existing scheduled-job secret)
//
// Fails closed: if NO secret is configured the function returns 503 and never
// runs, so it can never be invoked unauthenticated.

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function checkCronAuth(req: Request): CronAuthResult {
  const secret =
    Deno.env.get("CIRCLE_PROMPTS_CRON_SECRET")?.trim() ||
    Deno.env.get("CRON_SECRET")?.trim() ||
    Deno.env.get("DISPATCH_SCHEDULED_SECRET")?.trim() ||
    "";

  if (!secret) {
    return {
      ok: false,
      status: 503,
      error:
        "No cron secret configured. Set CIRCLE_PROMPTS_CRON_SECRET (or CRON_SECRET) and send it as the x-cron-secret header.",
    };
  }

  const provided = req.headers.get("x-cron-secret")?.trim() ?? "";
  if (provided !== secret) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  return { ok: true };
}
