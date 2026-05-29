// Deploy (JWT verified — callers must be logged-in Supabase users):
//   npx supabase functions deploy livekit-token
//
// Secrets (Edge Function → Dashboard → Secrets):
//   LIVEKIT_URL           — e.g. wss://your-project.livekit.cloud
//   LIVEKIT_API_KEY       — LiveKit Cloud API key (server)
//   LIVEKIT_API_SECRET    — LiveKit Cloud secret (server-only; never ship to app)
//
// Client uses EXPO_PUBLIC_LIVEKIT_URL (same WSS URL string as LIVEKIT_URL typically).

import { AccessToken } from "npm:livekit-server-sdk@2";
import { createClient } from "npm:@supabase/supabase-js@2";

import { edgeCorsHeaders } from "../_shared/edgeCors.ts";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
  isProjectApiKey,
} from "../_shared/supabaseEnv.ts";

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

type MintBody = { streamId?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const secretKey = getSupabaseSecretKey();

  const lkUrl = Deno.env.get("LIVEKIT_URL")?.trim();
  const lkKey = Deno.env.get("LIVEKIT_API_KEY")?.trim();
  const lkSecret = Deno.env.get("LIVEKIT_API_SECRET")?.trim();

  if (!supabaseUrl || !publishableKey || !secretKey) {
    return json({ error: "Server misconfigured." }, 503);
  }
  if (!lkUrl || !lkKey || !lkSecret) {
    return json({ error: "LiveKit is not configured on the server." }, 503);
  }

  if (!isProjectApiKey(req)) {
    return json({ error: "Forbidden" }, 403);
  }

  const authHeader = req.headers.get("Authorization");
  const userId = await getAuthedUserId(supabaseUrl, publishableKey, authHeader);
  if (!userId) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: MintBody = {};
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
  }

  const streamId = typeof body.streamId === "string" ? body.streamId.trim() : "";
  if (!streamId) {
    return json({ error: "streamId is required" }, 400);
  }

  const admin = createClient(supabaseUrl, secretKey);
  const { data: row, error: rowErr } = await admin
    .from("live_streams")
    .select(
      "id, host_id, status, livekit_room_name, broadcast_started_at, host_last_seen_at, ended_at, title, video_provider",
    )
    .eq("id", streamId)
    .maybeSingle();

  if (rowErr || !row) {
    return json({ error: "Stream not found", code: "not_found" }, 404);
  }

  const roomName =
    typeof row.livekit_room_name === "string" && row.livekit_room_name.length > 0
      ? row.livekit_room_name
      : `pv_live_${String(row.id).replace(/-/g, "")}`;

  if (!roomName.trim()) {
    return json({ error: "Stream unavailable", code: "missing_room" }, 403);
  }

  const isHost = row.host_id === userId;
  const status = String(row.status ?? "");

  if (status === "ended" || row.ended_at) {
    return json({ error: "Stream has ended", code: "ended" }, 403);
  }

  let role: "host" | "viewer";
  if (isHost) {
    role = "host";
    if (status !== "live" && status !== "scheduled") {
      return json({ error: "Invalid stream state for host", code: "invalid_state" }, 403);
    }
  } else {
    role = "viewer";
    const { data: joinable, error: joinErr } = await admin.rpc("live_stream_viewer_joinable", {
      p_stream_id: streamId,
    });
    if (joinErr) {
      console.error("[livekit-token] live_stream_viewer_joinable", joinErr.message);
      if (status !== "live") {
        return json({ error: "Stream is not live", code: "not_live" }, 403);
      }
      if (!row.broadcast_started_at) {
        return json({ error: "Broadcast has not started yet", code: "not_broadcasting" }, 403);
      }
    } else if (joinable && typeof joinable === "object" && joinable.ok === false) {
      const reason = String((joinable as { reason?: string }).reason ?? "unavailable");
      if (reason === "ended") {
        return json({ error: "Stream has ended", code: "ended" }, 403);
      }
      if (reason === "not_broadcasting") {
        return json({ error: "Broadcast has not started yet", code: "not_broadcasting" }, 403);
      }
      if (reason === "host_stale") {
        return json({ error: "Stream unavailable", code: "host_stale" }, 403);
      }
      if (reason === "missing_room") {
        return json({ error: "Stream unavailable", code: "missing_room" }, 403);
      }
      return json({ error: "Stream is not live", code: reason }, 403);
    }
  }

  const sessionNonce = crypto.randomUUID().slice(0, 8);
  const participantIdentity =
    role === "host"
      ? `host:${streamId}:${userId}`
      : `viewer:${streamId}:${userId}:${sessionNonce}`;
  const ttlSec = role === "host" ? 60 * 60 : 60 * 30;

  const at = new AccessToken(lkKey, lkSecret, {
    identity: participantIdentity,
    ttl: `${ttlSec}s`,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: role === "host",
    canSubscribe: true,
    canPublishData: false,
    canUpdateOwnMetadata: true,
    hidden: false,
    recorder: false,
  });

  const token = await at.toJwt();

  return json({
    token,
    serverUrl: lkUrl,
    roomName,
    participantIdentity,
    role,
    streamId,
    videoProvider: row.video_provider ?? "livekit",
    expiresAt: Math.floor(Date.now() / 1000) + ttlSec,
    grants: {
      roomJoin: true,
      canPublish: role === "host",
      canSubscribe: true,
    },
  });
});
