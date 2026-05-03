// Deploy: npx supabase functions deploy enqueue-creator-media-job
// Optional alternative to direct insert from the app; validates payload shape server-side later.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anon) return json({ error: "missing_env" }, 503);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (userErr || !uid) return json({ error: "unauthorized" }, 401);

  let body: { kind?: string; input?: Record<string, unknown>; idempotency_key?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const kind = body.kind;
  const allowed = [
    "trim",
    "timelapse",
    "stitch",
    "broll",
    "pitch_shift",
    "background_matte",
    "face_blur",
    "silence_detect",
    "cinemagraph_export",
    "parallax_export",
  ];
  if (!kind || !allowed.includes(kind)) return json({ error: "invalid_kind" }, 400);

  const { data: row, error } = await supabase
    .from("creator_media_jobs")
    .insert({
      user_id: uid,
      kind,
      input: body.input ?? {},
      idempotency_key: body.idempotency_key ?? null,
    } as never)
    .select()
    .single();

  if (error) return json({ error: error.message }, 400);
  return json({ job: row });
});
