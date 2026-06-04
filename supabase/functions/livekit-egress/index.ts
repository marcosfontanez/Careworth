// Deploy (JWT verified — host-only start/stop):
//   npx supabase functions deploy livekit-egress
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET  — same as livekit-token
//   LIVE_RECORDINGS_BUCKET                             — default live-recordings
//   STORAGE_S3_ACCESS_KEY_ID, STORAGE_S3_SECRET_ACCESS_KEY — from Project Settings → Storage → S3 Connection
//   STORAGE_S3_ENDPOINT                                — optional; derived from SUPABASE_URL if omitted
//   STORAGE_S3_REGION                                  — optional; default us-east-1
//   (Do not use SUPABASE_* names — Supabase reserves that prefix for built-in secrets.)

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  EgressClient,
  EgressStatus,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
} from "npm:livekit-server-sdk@2";

import { edgeCorsHeaders } from "../_shared/edgeCors.ts";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
  isProjectApiKey,
} from "../_shared/supabaseEnv.ts";

type Action = "start" | "stop";

type Body = {
  action?: Action;
  streamId?: string;
};

function corsHeaders(): Record<string, string> {
  return edgeCorsHeaders({
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

function livekitHttpHost(lkUrl: string): string {
  const trimmed = lkUrl.trim();
  if (trimmed.startsWith("wss://")) return `https://${trimmed.slice("wss://".length)}`;
  if (trimmed.startsWith("ws://")) return `http://${trimmed.slice("ws://".length)}`;
  return trimmed;
}

function storageS3Env(name: string): string | null {
  return Deno.env.get(name)?.trim() || null;
}

function supabaseS3Endpoint(supabaseUrl: string): string {
  const explicit =
    storageS3Env("STORAGE_S3_ENDPOINT") ?? storageS3Env("SUPABASE_S3_ENDPOINT");
  if (explicit) return explicit.replace(/\/$/, "");

  try {
    const url = new URL(supabaseUrl);
    const host = url.hostname;
    const projectRef = host.split(".")[0];
    if (projectRef) {
      return `https://${projectRef}.storage.supabase.co/storage/v1/s3`;
    }
  } catch {
    // Fall through.
  }
  return "";
}

function durationSeconds(startedAt: string | null, endedAt: string): number | null {
  if (!startedAt) return null;
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

async function getAuthedUserId(
  supabaseUrl: string,
  publishableKey: string,
  authHeader: string | null,
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const sb = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user?.id) return null;
  return data.user.id;
}

async function loadStream(admin: ReturnType<typeof createClient>, streamId: string) {
  const { data: row, error } = await admin
    .from("live_streams")
    .select("id, host_id, status, livekit_room_name, broadcast_started_at, ended_at")
    .eq("id", streamId)
    .maybeSingle();
  if (error || !row) return null;
  return row;
}

function roomNameFromRow(row: { id: string; livekit_room_name?: string | null }): string {
  if (typeof row.livekit_room_name === "string" && row.livekit_room_name.length > 0) {
    return row.livekit_room_name;
  }
  return `pv_live_${String(row.id).replace(/-/g, "")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const secretKey = getSupabaseSecretKey();

  if (!supabaseUrl || !publishableKey || !secretKey) {
    return json({ ok: false, error: "Server misconfigured." }, 503);
  }

  if (!isProjectApiKey(req)) {
    return json({ ok: false, error: "Forbidden" }, 403);
  }

  const authHeader = req.headers.get("Authorization");
  const userId = await getAuthedUserId(supabaseUrl, publishableKey, authHeader);
  if (!userId) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  let body: Body = {};
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }
  } else {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const action = body.action;
  const streamId = typeof body.streamId === "string" ? body.streamId.trim() : "";
  if (action !== "start" && action !== "stop") {
    return json({ ok: false, error: "action must be start or stop" }, 400);
  }
  if (!streamId) {
    return json({ ok: false, error: "streamId is required" }, 400);
  }

  const admin = createClient(supabaseUrl, secretKey);
  const stream = await loadStream(admin, streamId);
  if (!stream) {
    return json({ ok: false, error: "Stream not found", code: "not_found" }, 404);
  }
  if (stream.host_id !== userId) {
    return json({ ok: false, error: "Only the host can control recording", code: "forbidden" }, 403);
  }

  const roomName = roomNameFromRow(stream);

  if (action === "start") {
    if (stream.ended_at || stream.status === "ended") {
      return json({ ok: false, error: "Stream has ended", code: "ended" }, 403);
    }
    if (!stream.broadcast_started_at) {
      return json({ ok: false, error: "Broadcast has not started", code: "not_broadcasting" }, 403);
    }

    const { data: existing } = await admin
      .from("live_recordings")
      .select("id, status, egress_id")
      .eq("stream_id", streamId)
      .in("status", ["pending", "recording"])
      .maybeSingle();

    if (existing?.id) {
      return json({
        ok: true,
        skipped: true,
        recordingId: existing.id,
        egressId: existing.egress_id ?? null,
        reason: "already_active",
      });
    }

    const recordingId = crypto.randomUUID();
    const storagePath = `streams/${streamId}/${recordingId}.mp4`;

    const { data: inserted, error: insertErr } = await admin
      .from("live_recordings")
      .insert({
        id: recordingId,
        stream_id: streamId,
        host_id: stream.host_id,
        room_name: roomName,
        storage_path: storagePath,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr || !inserted?.id) {
      console.error("[livekit-egress] insert", insertErr?.message);
      return json({
        ok: false,
        error: "Could not create recording row",
        code: "insert_failed",
      });
    }

    const lkUrl = Deno.env.get("LIVEKIT_URL")?.trim();
    const lkKey = Deno.env.get("LIVEKIT_API_KEY")?.trim();
    const lkSecret = Deno.env.get("LIVEKIT_API_SECRET")?.trim();
    const bucket = Deno.env.get("LIVE_RECORDINGS_BUCKET")?.trim() || "live-recordings";
    const s3AccessKey =
      storageS3Env("STORAGE_S3_ACCESS_KEY_ID") ?? storageS3Env("SUPABASE_S3_ACCESS_KEY_ID");
    const s3Secret =
      storageS3Env("STORAGE_S3_SECRET_ACCESS_KEY") ??
      storageS3Env("SUPABASE_S3_SECRET_ACCESS_KEY");
    const s3Region =
      storageS3Env("STORAGE_S3_REGION") ?? storageS3Env("SUPABASE_S3_REGION") ?? "us-east-1";
    const s3Endpoint = supabaseS3Endpoint(supabaseUrl);

    if (!lkUrl || !lkKey || !lkSecret) {
      const msg = "LiveKit is not configured on the server.";
      await admin
        .from("live_recordings")
        .update({ status: "failed", error_message: msg, ended_at: new Date().toISOString() })
        .eq("id", recordingId);
      return json({ ok: false, recordingId, error: msg, code: "livekit_missing" });
    }

    if (!s3AccessKey || !s3Secret || !s3Endpoint) {
      const msg = "Recording storage (S3) is not configured on the server.";
      await admin
        .from("live_recordings")
        .update({ status: "failed", error_message: msg, ended_at: new Date().toISOString() })
        .eq("id", recordingId);
      return json({ ok: false, recordingId, error: msg, code: "storage_missing" });
    }

    try {
      const egressClient = new EgressClient(livekitHttpHost(lkUrl), lkKey, lkSecret);
      const fileOutput = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: storagePath,
        output: {
          case: "s3",
          value: new S3Upload({
            accessKey: s3AccessKey,
            secret: s3Secret,
            bucket,
            region: s3Region,
            endpoint: s3Endpoint,
            forcePathStyle: true,
          }),
        },
      });

      const info = await egressClient.startRoomCompositeEgress(roomName, { file: fileOutput });
      const egressId = info.egressId ?? null;
      const startedAt = new Date().toISOString();

      await admin
        .from("live_recordings")
        .update({
          egress_id: egressId,
          status: "recording",
          started_at: startedAt,
          error_message: null,
        })
        .eq("id", recordingId);

      return json({
        ok: true,
        recordingId,
        egressId,
        roomName,
        storagePath,
        status: "recording",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Egress start failed";
      console.error("[livekit-egress] start", msg);
      await admin
        .from("live_recordings")
        .update({
          status: "failed",
          error_message: msg,
          ended_at: new Date().toISOString(),
        })
        .eq("id", recordingId);
      return json({ ok: false, recordingId, error: msg, code: "egress_start_failed" });
    }
  }

  // stop
  const { data: active } = await admin
    .from("live_recordings")
    .select("id, egress_id, status, started_at")
    .eq("stream_id", streamId)
    .in("status", ["pending", "recording"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!active?.id) {
    return json({ ok: true, skipped: true, reason: "no_active_recording" });
  }

  const endedAt = new Date().toISOString();
  const lkUrl = Deno.env.get("LIVEKIT_URL")?.trim();
  const lkKey = Deno.env.get("LIVEKIT_API_KEY")?.trim();
  const lkSecret = Deno.env.get("LIVEKIT_API_SECRET")?.trim();

  if (!active.egress_id) {
    const dur = durationSeconds(active.started_at ?? null, endedAt);
    await admin
      .from("live_recordings")
      .update({
        status: "stopped",
        ended_at: endedAt,
        duration_seconds: dur,
        error_message: active.status === "pending" ? "No egress id — never started" : null,
      })
      .eq("id", active.id);
    return json({ ok: true, recordingId: active.id, status: "stopped", skipped: true });
  }

  if (!lkUrl || !lkKey || !lkSecret) {
    const msg = "LiveKit is not configured — could not stop egress.";
    await admin
      .from("live_recordings")
      .update({
        status: "stopped",
        ended_at: endedAt,
        duration_seconds: durationSeconds(active.started_at ?? null, endedAt),
        error_message: msg,
      })
      .eq("id", active.id);
    return json({ ok: true, recordingId: active.id, status: "stopped", warning: msg });
  }

  try {
    const egressClient = new EgressClient(livekitHttpHost(lkUrl), lkKey, lkSecret);
    const info = await egressClient.stopEgress(active.egress_id);
    const complete = info.status === EgressStatus.EGRESS_COMPLETE;
    const finalStatus = complete ? "completed" : "stopped";
    const dur =
      typeof info.duration === "number" && info.duration > 0
        ? Math.round(info.duration)
        : durationSeconds(active.started_at ?? null, endedAt);

    await admin
      .from("live_recordings")
      .update({
        status: finalStatus,
        ended_at: endedAt,
        duration_seconds: dur,
        error_message: info.error ? String(info.error) : null,
      })
      .eq("id", active.id);

    return json({
      ok: true,
      recordingId: active.id,
      egressId: active.egress_id,
      status: finalStatus,
      durationSeconds: dur,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Egress stop failed";
    console.error("[livekit-egress] stop", msg);
    await admin
      .from("live_recordings")
      .update({
        status: "stopped",
        ended_at: endedAt,
        duration_seconds: durationSeconds(active.started_at ?? null, endedAt),
        error_message: msg,
      })
      .eq("id", active.id);
    return json({
      ok: true,
      recordingId: active.id,
      status: "stopped",
      warning: msg,
    });
  }
});
