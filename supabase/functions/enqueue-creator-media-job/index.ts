// Deploy: npx supabase functions deploy enqueue-creator-media-job
// Optional alternative to direct insert from the app; validates payload shape server-side later.

import { createClient } from "npm:@supabase/supabase-js@2";

import { edgeCorsHeaders } from "../_shared/edgeCors.ts";
import { getSupabasePublishableKey, getSupabaseUrl } from "../_shared/supabaseEnv.ts";

const corsHeaders = edgeCorsHeaders({
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  if (!supabaseUrl || !publishableKey) return json({ error: "missing_env" }, 503);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, publishableKey, {
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
  // Only kinds the creator-media-worker actually implements. Roadmap kinds
  // (timelapse, pitch_shift, background_matte, face_blur, silence_detect,
  // cinemagraph_export, parallax_export) are intentionally rejected so we never
  // strand a job in 'queued' forever. Keep in sync with migration 246's insert
  // policy and the worker switch.
  const allowed = ["trim", "stitch", "broll", "video_composition"];
  if (!kind || !allowed.includes(kind)) return json({ error: "invalid_kind" }, 400);

  const input = body.input ?? {};

  const TARGET_POST_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const tpid = input.target_post_id;
  if (tpid != null && typeof tpid === "string" && tpid.trim()) {
    if (!TARGET_POST_UUID.test(tpid.trim())) {
      return json({ error: "invalid target_post_id (expected UUID)" }, 400);
    }
  }

  if (kind === "stitch") {
    const clipPaths = input.clipPaths;
    if (!Array.isArray(clipPaths) || clipPaths.length === 0 || !clipPaths.every((x: unknown) => typeof x === "string")) {
      return json({ error: "stitch requires input.clipPaths as non-empty string[]" }, 400);
    }
  }
  if (kind === "broll") {
    if (typeof input.mainPath !== "string" || !input.mainPath.trim()) {
      return json({ error: "broll requires input.mainPath string" }, 400);
    }
    const cut = input.cutawayPaths;
    if (!Array.isArray(cut) || !cut.every((x: unknown) => typeof x === "string")) {
      return json({ error: "broll requires input.cutawayPaths as string[]" }, 400);
    }
  }
  if (kind === "video_composition" && input.greenScreen && typeof input.greenScreen === "object") {
    // Green Screen Studio (Phase 3). Worker re-validates + has hard caps as fallback.
    const gs = input.greenScreen as Record<string, unknown>;
    if (typeof gs.foregroundPath !== "string" || !gs.foregroundPath.trim()) {
      return json({ error: "greenScreen.foregroundPath must be a string" }, 400);
    }
    if (typeof gs.backgroundPath !== "string" || !gs.backgroundPath.trim()) {
      return json({ error: "greenScreen.backgroundPath must be a string" }, 400);
    }
    if (!["image", "video"].includes(String(gs.backgroundType))) {
      return json({ error: "greenScreen.backgroundType must be image or video" }, 400);
    }
    if (
      gs.keyColor != null &&
      !/^0x[0-9a-fA-F]{6}$/.test(String(gs.keyColor).trim())
    ) {
      return json({ error: "greenScreen.keyColor must be 0xRRGGBB" }, 400);
    }
    if (
      gs.audioMode != null &&
      !["foreground", "background", "both"].includes(String(gs.audioMode))
    ) {
      return json({ error: "greenScreen.audioMode invalid" }, 400);
    }
    const fgDur = Number(gs.foregroundDurationSeconds);
    if (Number.isFinite(fgDur) && fgDur > 180) {
      return json({ error: "foreground video exceeds 180s" }, 400);
    }
  } else if (kind === "video_composition") {
    // V1 Cutaway/Overlay limits (worker also re-validates + has hard caps as fallback).
    const MAX_LAYERS = 3;
    const MAX_LAYER_DURATION_SEC = 30;
    const MAX_TOTAL_OVERLAY_SEC = 60;
    const MAX_MAIN_DURATION_SEC = 180;

    const main = input.main;
    if (!main || typeof main !== "object") {
      return json({ error: "video_composition requires input.main object" }, 400);
    }
    const mainPath = (main as Record<string, unknown>).path;
    if (typeof mainPath !== "string" || !mainPath.trim()) {
      return json({ error: "video_composition requires input.main.path string" }, 400);
    }
    const mainDuration = Number((main as Record<string, unknown>).durationSeconds);
    if (Number.isFinite(mainDuration) && mainDuration > MAX_MAIN_DURATION_SEC) {
      return json({ error: `main video exceeds ${MAX_MAIN_DURATION_SEC}s` }, 400);
    }

    const layers = input.layers;
    if (!Array.isArray(layers) || layers.length === 0) {
      return json({ error: "video_composition requires input.layers as non-empty array" }, 400);
    }
    if (layers.length > MAX_LAYERS) {
      return json({ error: `too many cutaways (max ${MAX_LAYERS})` }, 400);
    }

    let totalOverlay = 0;
    for (let i = 0; i < layers.length; i++) {
      const l = layers[i];
      if (!l || typeof l !== "object") {
        return json({ error: `layers[${i}] must be an object` }, 400);
      }
      const layer = l as Record<string, unknown>;
      // 'cutaway' (full-screen), 'pip'/'overlay' (floating overlay), or 'cutout' (crop overlay).
      if (!["cutaway", "pip", "overlay", "cutout"].includes(String(layer.type))) {
        return json({ error: `layers[${i}].type must be "cutaway", "pip", or "cutout"` }, 400);
      }
      const isCutout = layer.type === "cutout";
      const isPip = layer.type === "pip" || layer.type === "overlay" || isCutout;
      if (typeof layer.path !== "string" || !layer.path.trim()) {
        return json({ error: `layers[${i}].path must be a string` }, 400);
      }
      const trimStart = Number(layer.trimStart);
      const trimEnd = Number(layer.trimEnd);
      const tlStart = Number(layer.timelineStart);
      const tlEnd = Number(layer.timelineEnd);
      if (![trimStart, trimEnd, tlStart, tlEnd].every(Number.isFinite)) {
        return json({ error: `layers[${i}] needs numeric trim/timeline values` }, 400);
      }
      if (trimEnd <= trimStart || tlEnd <= tlStart) {
        return json({ error: `layers[${i}] has invalid trim/timeline range` }, 400);
      }
      const layerDur = trimEnd - trimStart;
      if (layerDur > MAX_LAYER_DURATION_SEC) {
        return json({ error: `layers[${i}] exceeds ${MAX_LAYER_DURATION_SEC}s` }, 400);
      }
      const audioMode = layer.audioMode;
      if (audioMode != null && !["muted", "both", "broll_only"].includes(String(audioMode))) {
        return json({ error: `layers[${i}].audioMode invalid` }, 400);
      }
      if (isPip) {
        const pos = layer.position;
        if (
          pos != null &&
          !["topRight", "topLeft", "bottomRight", "bottomLeft", "center"].includes(String(pos))
        ) {
          return json({ error: `layers[${i}].position invalid` }, 400);
        }
        const size = layer.size;
        if (size != null && !["small", "medium", "large"].includes(String(size))) {
          return json({ error: `layers[${i}].size invalid` }, 400);
        }
      }
      if (isCutout && layer.crop != null) {
        const crop = layer.crop as Record<string, unknown>;
        if (
          crop.preset != null &&
          !["full", "left", "right", "top", "bottom", "center"].includes(String(crop.preset))
        ) {
          return json({ error: `layers[${i}].crop.preset invalid` }, 400);
        }
      }
      totalOverlay += (tlEnd - tlStart);
    }
    if (totalOverlay > MAX_TOTAL_OVERLAY_SEC) {
      return json({ error: `total cutaway overlay exceeds ${MAX_TOTAL_OVERLAY_SEC}s` }, 400);
    }
  }

  if (kind === "trim") {
    if (typeof input.storagePathIn !== "string" || !input.storagePathIn.trim()) {
      return json({ error: "trim requires input.storagePathIn string" }, 400);
    }
    const start = Number(input.trimStartSec);
    const end = Number(input.trimEndSec);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return json({ error: "trim requires valid trimStartSec and trimEndSec" }, 400);
    }
    const liveClipId =
      typeof input.target_live_clip_id === "string" ? input.target_live_clip_id.trim() : "";
    const postId = typeof input.target_post_id === "string" ? input.target_post_id.trim() : "";
    if (!liveClipId && !postId) {
      return json({ error: "trim requires target_live_clip_id or target_post_id UUID" }, 400);
    }
    if (liveClipId && !TARGET_POST_UUID.test(liveClipId)) {
      return json({ error: "trim target_live_clip_id must be UUID" }, 400);
    }
    if (postId && !TARGET_POST_UUID.test(postId)) {
      return json({ error: "trim target_post_id must be UUID" }, 400);
    }
  }

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
