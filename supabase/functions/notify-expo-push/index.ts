// Deploy: npx supabase functions deploy notify-expo-push --no-verify-jwt
//
// Intended caller: Supabase Database Webhook on `public.notifications` INSERT (or your worker).
// Sends one Expo push using `user_push_tokens.token` and deep-link `data` the app already understands
// (see `lib/notifications.ts`). Skips pushes from blocked actors and replaces
// UGC-bearing bodies (comments/replies) with safe generic copy.

import { createClient } from "npm:@supabase/supabase-js@2";

import { edgeCorsHeaders } from "../_shared/edgeCors.ts";
import { getSupabaseSecretKey, getSupabaseUrl } from "../_shared/supabaseEnv.ts";

const corsHeaders = edgeCorsHeaders({
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
});

const LEGACY_CIRCLE_THREAD_REPLY_MESSAGE = "New reply in your circle thread";

function isCircleThreadPush(
  type: string,
  message: string,
): boolean {
  return (
    type === "circle_thread_reply" ||
    (type === "reply" && message === LEGACY_CIRCLE_THREAD_REPLY_MESSAGE)
  );
}

// Notification types whose pre-rendered `message` may embed raw user-generated
// content (comment/reply body, post caption). Push notifications go to the OS
// shade/lock screen, so we replace the body with safe generic copy for these.
const UGC_BODY_BY_TYPE: Record<string, string> = {
  comment: "New comment on your post",
  reply: "Someone replied to you",
  circle_thread_reply: "New reply in your circle thread",
  circle_new_post: "New post in your circle",
  circle_post_digest: "New activity in your circles",
};

function safePushBody(type: string, fallbackMessage: string): string {
  const safe = UGC_BODY_BY_TYPE[type];
  return (safe ?? fallbackMessage).slice(0, 178);
}

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

  // Fail closed: the webhook secret is REQUIRED. Without it, an unauthenticated
  // caller could trigger pushes / probe for valid user ids.
  const webhookSecret = Deno.env.get("NOTIFY_PUSH_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return json({ error: "push webhook secret not configured" }, 503);
  }
  if (req.headers.get("x-webhook-secret") !== webhookSecret) {
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

  const supabaseUrl = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  if (!supabaseUrl || !secretKey) {
    return json({ error: "SUPABASE_URL or secret API key missing" }, 503);
  }

  const site = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://pulseverse.app").replace(/\/$/, "");

  const supabase = createClient(supabaseUrl, secretKey);

  // Do not push notifications originating from a user the recipient has blocked
  // (or who has blocked the recipient). The notification row may already exist;
  // the push is the part that surfaces blocked-user content on the lock screen.
  const actorId = (record.actor_id as string | null | undefined)?.trim();
  if (actorId && actorId !== userId) {
    const { data: blocks } = await supabase
      .from("blocked_users")
      .select("blocker_id, blocked_id")
      .or(
        `and(blocker_id.eq.${userId},blocked_id.eq.${actorId}),and(blocker_id.eq.${actorId},blocked_id.eq.${userId})`,
      )
      .limit(1);
    if (blocks && blocks.length > 0) {
      return json({ ok: true, skipped: "blocked actor" });
    }
  }

  const { data: tokenRow } = await supabase
    .from("user_push_tokens")
    .select("token")
    .eq("user_id", userId)
    .maybeSingle();

  const expoToken = (tokenRow?.token as string | undefined)?.trim();
  if (!expoToken) {
    return json({ ok: true, skipped: "no push token" });
  }

  const message = String(record.message ?? "Notification");
  const type = String(record.type ?? "");
  const targetId = record.target_id as string | null | undefined;
  const communityId = record.community_id as string | null | undefined;

  const data: Record<string, string> = {};

  if (isCircleThreadPush(type, message) && targetId && communityId) {
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
  } else if (
    (type === "comment" || type === "reply") &&
    targetId
  ) {
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
  } else if (type === "circle_new_post" && targetId) {
    data.postId = targetId;
    if (communityId) {
      const { data: comm } = await supabase
        .from("communities")
        .select("slug")
        .eq("id", communityId)
        .maybeSingle();
      if (comm?.slug) {
        data.circleSlug = comm.slug;
        data.url = `${site}/post/${targetId}?circle=${encodeURIComponent(comm.slug)}`;
      } else {
        data.url = `${site}/post/${targetId}`;
      }
    } else {
      data.url = `${site}/post/${targetId}`;
    }
  } else if (type === "circle_post_digest" && communityId) {
    const { data: comm } = await supabase
      .from("communities")
      .select("slug")
      .eq("id", communityId)
      .maybeSingle();
    if (comm?.slug) {
      data.circleSlug = comm.slug;
      data.url = `${site}/communities/${comm.slug}`;
    } else {
      data.url = `${site}/notifications`;
    }
  } else if (type === "creator_new_post" && targetId) {
    data.postId = targetId;
    data.url = `${site}/post/${targetId}`;
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
  } else if (type === "diamonds_earned") {
    data.url = `${site}/pulse-shop`;
  } else if (type === "gift_sent" && targetId) {
    data.profileId = targetId;
    data.url = `${site}/profile/${targetId}`;
  } else if ((type === "live_go_live" || type === "live_stream_live") && targetId) {
    data.streamId = targetId;
    data.liveStreamId = targetId;
    data.url = `${site}/live/${targetId}`;
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
      body: safePushBody(type, message),
      data,
      sound: "default",
      priority: "high",
    }),
  });

  const expoJson: unknown = await expoRes.json().catch(() => ({}));
  return json({ ok: expoRes.ok, expo: expoJson }, expoRes.ok ? 200 : 502);
});
