// Deploy: npx supabase functions deploy dispatch-scheduled --no-verify-jwt
//
// Intended caller: Supabase Scheduled Function (cron) or external cron POST.
// Uses service role to flip `scheduled_posts_due_v1` rows to `scheduled_status = 'live'`.
//
// Security: set DISPATCH_SCHEDULED_SECRET in the function env; every invocation must send the same
// value in the `x-cron-secret` header (503 if the secret is unset).

import { createClient } from "npm:@supabase/supabase-js@2";

import { edgeCorsHeaders } from "../_shared/edgeCors.ts";
import { getSupabaseSecretKey, getSupabaseUrl } from "../_shared/supabaseEnv.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const secret = Deno.env.get("DISPATCH_SCHEDULED_SECRET")?.trim();
  if (!secret) {
    return json(
      {
        error:
          "DISPATCH_SCHEDULED_SECRET is not set — configure a shared secret and send it as header x-cron-secret.",
      },
      503,
    );
  }
  if (req.headers.get("x-cron-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabaseUrl = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  if (!supabaseUrl || !secretKey) {
    return json({ error: "SUPABASE_URL or secret API key missing" }, 503);
  }

  const supabase = createClient(supabaseUrl, secretKey);

  const { data: due, error: dueErr } = await supabase
    .from("scheduled_posts_due_v1")
    .select("id")
    .limit(500);

  if (dueErr) {
    return json({ error: dueErr.message }, 500);
  }

  const ids = (due ?? []).map((r: { id: string }) => r.id).filter(Boolean);
  if (ids.length === 0) {
    return json({ ok: true, published: 0 });
  }

  const { error: upErr } = await supabase
    .from("posts")
    .update({ scheduled_status: "live" })
    .in("id", ids)
    .eq("scheduled_status", "scheduled");

  if (upErr) {
    return json({ error: upErr.message }, 500);
  }

  return json({ ok: true, published: ids.length, ids });
});
