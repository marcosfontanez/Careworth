// Deploy: npx supabase functions deploy notify-expo-push --no-verify-jwt
//
// Intended caller: Supabase Database Webhook on `public.notifications` INSERT (or your worker).
// Sends one Expo push using `profiles.push_token` and deep-link `data` the app already understands
// (see `lib/notifications.ts`).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const CIRCLE_THREAD_REPLY_MESSAGE = "New reply in your circle thread";

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

  const webhookSecret = Deno.env.get("NOTIFY_PUSH_WEBHOOK_SECRET");
  if (webhookSecret && req.headers.get("x-webhook-secret") !== webhookSecret) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const record = (payload.record ?? payload) as Record<string, unknown> | undefined;
  if (!record || typeof record !== "object") {
    return json({ ok: true, skipped: "no record" });
  }

  const userId = record.user_id as string | undefined;
  if (!userId) {
    return json({ ok: true });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing" }, 503);
  }

  const site = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://pulseverse.app").replace(/\/$/, "");

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: profile } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", userId)
    .maybeSingle();

  const expoToken = profile?.push_token?.trim();
  if (!expoToken) {
    return json({ ok: true, skipped: "no push token" });
  }

  const message = String(record.message ?? "Notification");
  const type = String(record.type ?? "");
  const targetId = record.target_id as string | null | undefined;
  const communityId = record.community_id as string | null | undefined;

  const data: Record<string, string> = {};

  if (type === "reply" && message === CIRCLE_THREAD_REPLY_MESSAGE && targetId && communityId) {
    const { data: comm } = await supabase
      .from("communities")
      .select("slug")
      .eq("id", communityId)
      .maybeSingle();
    if (comm?.slug) {
      data.circleSlug = comm.slug;
      data.threadId = targetId;
      data.url = `${site}/communities/${comm.slug}/thread/${targetId}`;
    }
  } else if (
    (type === "comment" || type === "reply") &&
    typeof targetId === "string" &&
    targetId.startsWith("profile_update:")
  ) {
    /* My Pulse comment / reply — same prefix as migration 049 mentions. */
    data.url = `${site}/my-pulse`;
  } else if (type === "comment" && targetId) {
    data.postId = targetId;
    data.url = `${site}/post/${targetId}`;
  } else if (
    (type === "like" ||
      type === "save" ||
      type === "share" ||
      type === "reaction" ||
      type === "post_like") &&
    targetId
  ) {
    data.postId = targetId;
    data.url = `${site}/post/${targetId}`;
  } else if (type === "new_follower" && targetId) {
    data.profileId = targetId;
    data.url = `${site}/profile/${targetId}`;
  } else if (type === "community_invite" && targetId) {
    const { data: comm } = await supabase
      .from("communities")
      .select("slug")
      .eq("id", targetId)
      .maybeSingle();
    if (comm?.slug) {
      data.url = `${site}/communities/${comm.slug}`;
    } else {
      data.url = `${site}/download`;
    }
  } else if (type === "tier_up") {
    data.profileId = userId;
    data.url = `${site}/profile/${userId}`;
  }

  if (!data.url) {
    data.url = `${site}/notifications`;
  }

  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (expoAccessToken) {
    headers.Authorization = `Bearer ${expoAccessToken}`;
  }

  const expoRes = await fetch("https://api.expo.dev/v2/push/send", {
    method: "POST",
    headers,
    body: JSON.stringify({
      to: expoToken,
      title: "PulseVerse",
      body: message.slice(0, 178),
      data,
      sound: "default",
      priority: "high",
    }),
  });

  const expoJson: unknown = await expoRes.json().catch(() => ({}));
  return json({ ok: expoRes.ok, expo: expoJson }, expoRes.ok ? 200 : 502);
});
