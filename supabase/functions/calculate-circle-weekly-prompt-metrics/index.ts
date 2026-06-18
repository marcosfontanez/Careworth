// Deploy: npx supabase functions deploy calculate-circle-weekly-prompt-metrics --no-verify-jwt
//
// Intended caller: Supabase Scheduled Function (cron) or external cron POST,
// every Monday BEFORE generate-circle-weekly-prompts. Also safe to call
// manually for backfills.
//
// What it does: aggregates engagement for every weekly prompt of a completed
// week into circle_weekly_prompt_metrics by invoking the SQL function
// public.calc_circle_weekly_prompt_metrics(week_start). All the heavy lifting
// is in SQL so this stays a thin, reliable wrapper.
//
// Auth: x-cron-secret header (see _shared/circle-prompts/cronAuth.ts).
//
// Body (all optional):
//   { "week_start_date": "YYYY-MM-DD" }   // defaults to previous completed week

import { createClient } from "npm:@supabase/supabase-js@2";

import { edgeCorsHeaders } from "../_shared/edgeCors.ts";
import { getSupabaseSecretKey, getSupabaseUrl } from "../_shared/supabaseEnv.ts";
import { checkCronAuth } from "../_shared/circle-prompts/cronAuth.ts";

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

  const auth = checkCronAuth(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const supabaseUrl = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  if (!supabaseUrl || !secretKey) {
    return json({ error: "SUPABASE_URL or secret API key missing" }, 503);
  }

  let weekStart: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.week_start_date === "string" && body.week_start_date.trim()) {
      weekStart = body.week_start_date.trim();
    }
  } catch {
    // No/invalid body is fine — default to previous completed week.
  }

  const supabase = createClient(supabaseUrl, secretKey);

  const { data, error } = await supabase.rpc("calc_circle_weekly_prompt_metrics", {
    p_week_start: weekStart,
  });

  if (error) {
    return json({ ok: false, error: error.message }, 500);
  }

  return json({ ok: true, result: data });
});
