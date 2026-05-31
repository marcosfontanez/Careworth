import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

import { ANON_SENTINEL } from "./circles-data";
import { loadBlockedUserIds } from "./engagement-data";
import { toHttps } from "./format";

type AnyRow = Record<string, unknown>;
type Supa = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const LIMIT = 50;

/** Confession-scoped types whose actor must be masked inside the confessions circle. */
const CONFESSIONS_SCOPED = new Set([
  "circle_new_post",
  "circle_post_digest",
  "circle_thread_reply",
  "comment",
  "reply",
]);

/** Notification types whose `target_id` points at a post. */
const POST_TARGET_TYPES = new Set([
  "like",
  "save",
  "share",
  "comment",
  "reply",
  "mention",
  "creator_new_post",
  "circle_new_post",
]);

/** Types that point at the actor / a profile. */
const PROFILE_TARGET_TYPES = new Set(["new_follower", "tier_up", "gift_sent"]);

const LIVE_TYPES = new Set(["live_go_live", "live_stream_live"]);

export type WebNotificationActor = {
  /** Non-null only when tapping should open a real profile (not anonymous/system). */
  profileId: string | null;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isSelf: boolean;
};

export type WebNotification = {
  id: string;
  type: string;
  message: string;
  createdAt: string | null;
  read: boolean;
  actor: WebNotificationActor;
  /** Destination route, or null when the notification is informational only. */
  href: string | null;
};

export type WebNotificationsResult =
  | { state: "error" }
  | { state: "ok"; notifications: WebNotification[]; unreadCount: number };

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function resolveHref(
  type: string,
  targetId: string | null,
  communityId: string | null,
  slugById: Map<string, string>,
  actorId: string | null,
  viewerId: string,
): string | null {
  // My Pulse comments carry a `profile_update:<id>` target.
  if (targetId && targetId.startsWith("profile_update:")) {
    return "/web-app/my-pulse";
  }

  if (LIVE_TYPES.has(type)) return "/web-app/live";

  if (type === "circle_thread_reply") {
    const slug = communityId ? slugById.get(communityId) : null;
    if (slug && targetId) return `/web-app/circles/${slug}/thread/${targetId}`;
    return "/web-app/circles";
  }

  if (type === "circle_post_digest") {
    const cid = communityId ?? targetId;
    const slug = cid ? slugById.get(cid) : null;
    return slug ? `/web-app/circles/${slug}` : "/web-app/circles";
  }

  if (type === "community_invite") {
    const slug = targetId ? slugById.get(targetId) : null;
    return slug ? `/web-app/circles/${slug}` : "/web-app/circles";
  }

  if (PROFILE_TARGET_TYPES.has(type)) {
    if (actorId && actorId === viewerId) return "/web-app/my-pulse";
    if (targetId) return targetId === viewerId ? "/web-app/my-pulse" : `/web-app/user/${targetId}`;
    if (actorId) return `/web-app/user/${actorId}`;
    return null;
  }

  if (POST_TARGET_TYPES.has(type) && targetId) {
    return `/post/${targetId}`;
  }

  return null;
}

/**
 * Load the signed-in viewer's recent notifications for the web. RLS scopes
 * `notifications` to `user_id = auth.uid()`, so a viewer only ever sees their
 * own. Actors are masked to "Anonymous" for confession-scoped activity (and any
 * missing actor), and notifications from blocked users (either direction) are
 * dropped entirely — the pre-rendered `message` can embed a name we cannot redact.
 */
export async function loadWebNotifications(viewerId: string): Promise<WebNotificationsResult> {
  if (!isSupabaseConfigured() || !viewerId) return { state: "error" };
  let supabase: Supa;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }

  try {
    const [rowsRes, confessionsRes, blocked] = await Promise.all([
      supabase
        .from("notifications")
        .select(
          "id, type, actor_id, message, created_at, read, target_id, community_id, actor_profile:actor_id(id, display_name, username, avatar_url, is_verified)",
        )
        .eq("user_id", viewerId)
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      supabase.from("communities").select("id").eq("slug", "confessions").maybeSingle(),
      loadBlockedUserIds(supabase, viewerId),
    ]);

    if (rowsRes.error) return { state: "error" };
    const rows = (rowsRes.data ?? []) as AnyRow[];
    const confessionsCommunityId = str((confessionsRes.data as AnyRow | null)?.id);

    // Drop notifications from blocked users (either direction) before anything else.
    const visible = rows.filter((r) => {
      const aid = str(r.actor_id);
      return !(aid && blocked.has(aid));
    });

    // Batch-resolve community slugs for circle / invite routing.
    const communityIds = new Set<string>();
    for (const r of visible) {
      const cid = str(r.community_id);
      if (cid) communityIds.add(cid);
      if (String(r.type) === "community_invite") {
        const tid = str(r.target_id);
        if (tid) communityIds.add(tid);
      }
    }
    const slugById = new Map<string, string>();
    if (communityIds.size > 0) {
      const { data: comms } = await supabase
        .from("communities")
        .select("id, slug")
        .in("id", [...communityIds]);
      for (const c of (comms ?? []) as AnyRow[]) {
        const id = str(c.id);
        const slug = str(c.slug);
        if (id && slug) slugById.set(id, slug);
      }
    }

    let unreadCount = 0;
    const notifications: WebNotification[] = visible.map((r) => {
      const type = String(r.type ?? "");
      const actorId = str(r.actor_id);
      const communityId = str(r.community_id);
      const targetId = str(r.target_id);
      const message = str(r.message) ?? "";
      const read = Boolean(r.read);
      if (!read) unreadCount += 1;

      const rawProfile = r.actor_profile;
      const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as AnyRow | null;
      const actorMissing = !actorId || actorId === ANON_SENTINEL || !profile;
      const isSelf = !!actorId && actorId === viewerId;
      const confessionScoped =
        !!confessionsCommunityId && communityId === confessionsCommunityId && CONFESSIONS_SCOPED.has(type);
      const messageSaysAnon = type === "circle_new_post" && message.toLowerCase().includes("anonymous");
      const mask = !isSelf && (actorMissing || confessionScoped || messageSaysAnon);

      const actor: WebNotificationActor = mask
        ? { profileId: null, displayName: "Anonymous", avatarUrl: null, isVerified: false, isSelf: false }
        : {
            profileId: actorId,
            displayName:
              str(profile?.display_name) || str(profile?.username) || "PulseVerse member",
            avatarUrl: toHttps(profile?.avatar_url),
            isVerified: Boolean(profile?.is_verified),
            isSelf,
          };

      return {
        id: String(r.id),
        type,
        message,
        createdAt: str(r.created_at),
        read,
        actor,
        href: resolveHref(type, targetId, communityId, slugById, actorId, viewerId),
      };
    });

    return { state: "ok", notifications, unreadCount };
  } catch {
    return { state: "error" };
  }
}
