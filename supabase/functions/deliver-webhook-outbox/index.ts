// Deploy: npx supabase functions deploy deliver-webhook-outbox --no-verify-jwt
//
// Drains public.webhook_outbox to configured webhook_destinations when the
// webhook_delivery feature flag is enabled.
//
// Intended caller: Supabase pg_cron + pg_net (migration 281) or manual POST with
// x-cron-secret header.
//
// Secrets (Edge Function env — never exposed to clients):
//   WEBHOOK_DELIVERY_CRON_SECRET  (or CRON_SECRET / DISPATCH_SCHEDULED_SECRET)
//   Per-destination signing: metadata.signing_secret_env_key → Deno.env.get(key)

import { createClient } from "npm:@supabase/supabase-js@2";

import { edgeCorsHeaders } from "../_shared/edgeCors.ts";
import { getSupabaseSecretKey, getSupabaseUrl } from "../_shared/supabaseEnv.ts";
import { checkWebhookDeliveryCronAuth } from "../_shared/webhook-delivery/cronAuth.ts";
import { runWebhookDeliveryWorker } from "../_shared/webhook-delivery/worker.ts";

const corsHeaders = edgeCorsHeaders({
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolveSigningSecret(envKey: string | null): string | null {
  if (!envKey) return null;
  const value = Deno.env.get(envKey)?.trim();
  return value || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = checkWebhookDeliveryCronAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const supabaseUrl = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  if (!supabaseUrl || !secretKey) {
    return json({ ok: false, error: "SUPABASE_URL or secret API key missing" }, 503);
  }

  const supabase = createClient(supabaseUrl, secretKey);

  try {
    const summary = await runWebhookDeliveryWorker(supabase, { resolveSigningSecret });
    console.log("[deliver-webhook-outbox]", JSON.stringify(summary));
    return json({ ok: true, summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[deliver-webhook-outbox] fatal:", message);
    return json({ ok: false, error: message }, 500);
  }
});
