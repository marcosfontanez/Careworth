import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

import { loadBlockedUserIds, loadFollowingIds, loadLikedPostIds } from "./engagement-data";

export type WebFeedTab = "foryou" | "following" | "top";

export type WebFeedAuthor = {
  id: string | null;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};

export type WebFeedPost = {
  id: string;
  type: string;
  caption: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string | null;
  isAnonymous: boolean;
  isVideo: boolean;
  /** `null` for anonymous posts — never expose identity. */
  author: WebFeedAuthor | null;
  likeCount: number;
  commentCount: number;
  /** Whether the signed-in viewer has liked this post. */
  likedByViewer: boolean;
  /** Whether the signed-in viewer already follows this (non-anonymous) author. */
  authorFollowedByViewer: boolean;
};

export type WebFeedResult =
  | { state: "signedOut" }
  | { state: "error" }
  | { state: "ok"; posts: WebFeedPost[] };

const FEED_LIMIT = 24;
/** Posts still rendering / failed must never appear in the feed. */
const PROCESSING_BLOCK = new Set(["queued", "running", "failed"]);
/** Only public / aliased posts are feed-eligible to other viewers. */
const PUBLIC_PRIVACY = new Set(["public", "alias"]);

type RankRow = { post_id?: string | null };

function toHttps(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const s = url.trim();
  if (!s) return null;
  if (s.startsWith("http://")) return `https://${s.slice(7)}`;
  return s;
}

function isVideoType(type: unknown): boolean {
  const t = String(type ?? "").toLowerCase();
  return t.includes("video") || t.includes("clip") || t === "live";
}

export type WebPostResult =
  | { state: "error" }
  | { state: "unavailable" }
  | { state: "ok"; post: WebFeedPost; isOwner: boolean };

/**
 * A single post for the native web post page (/web-app/post/[id]). Visibility is
 * enforced by `posts_viewer_safe` (RLS) first; we add the same web guards used by
 * the feed: live + not processing, public/alias (or owned by the viewer), and
 * blocked/hidden exclusions. Anonymous authors stay masked (no profile link).
 */
export async function loadWebPost(postId: string, viewerId: string): Promise<WebPostResult> {
  if (!isSupabaseConfigured() || !postId) return { state: "error" };
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }

  try {
    const { data: row, error } = await supabase
      .from("posts_viewer_safe")
      .select("*")
      .eq("id", postId)
      .maybeSingle();
    if (error) return { state: "error" };
    if (!row) return { state: "unavailable" };

    const r = row as Record<string, unknown> & { id: string };
    const creatorId = typeof r.creator_id === "string" ? r.creator_id : null;
    const isOwner = creatorId != null && creatorId === viewerId;

    const sched = String(r.scheduled_status ?? "live").toLowerCase();
    if (sched !== "live") return { state: "unavailable" };
    const proc = String(r.media_processing_status ?? "").toLowerCase().trim();
    if (PROCESSING_BLOCK.has(proc)) return { state: "unavailable" };

    const privacy = String(r.privacy_mode ?? "public").toLowerCase();
    if (!PUBLIC_PRIVACY.has(privacy) && !isOwner) return { state: "unavailable" };

    // Blocked (either direction) / hidden creators are never viewable, even by id.
    if (creatorId && !isOwner) {
      const blocked = await loadBlockedUserIds(supabase, viewerId);
      if (blocked.has(creatorId)) return { state: "unavailable" };
    }

    const anon = Boolean(r.is_anonymous) || !creatorId;
    type ProfileLite = { display_name: string | null; username: string | null; avatar_url: string | null };
    let prof: ProfileLite | null = null;
    if (!anon && creatorId) {
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", creatorId)
        .maybeSingle();
      prof = (p as ProfileLite | null) ?? null;
    }

    const [likedSet, followingSet] = await Promise.all([
      loadLikedPostIds(supabase, viewerId, [r.id]),
      anon || !creatorId
        ? Promise.resolve(new Set<string>())
        : loadFollowingIds(supabase, viewerId, [creatorId]),
    ]);

    const post: WebFeedPost = {
      id: r.id,
      type: String(r.type ?? "post"),
      caption: typeof r.caption === "string" ? r.caption : null,
      mediaUrl: toHttps(r.media_url),
      thumbnailUrl: toHttps(r.thumbnail_url),
      createdAt: typeof r.created_at === "string" ? r.created_at : null,
      isAnonymous: anon,
      isVideo: isVideoType(r.type),
      author: anon
        ? null
        : {
            id: creatorId,
            displayName: prof?.display_name?.trim() || prof?.username || "PulseVerse member",
            username: prof?.username ?? null,
            avatarUrl: toHttps(prof?.avatar_url),
          },
      likeCount: Number(r.like_count ?? 0) || 0,
      commentCount: Number(r.comment_count ?? 0) || 0,
      likedByViewer: likedSet.has(r.id),
      authorFollowedByViewer: !anon && creatorId ? followingSet.has(creatorId) : false,
    };

    return { state: "ok", post, isOwner };
  } catch {
    return { state: "error" };
  }
}

export async function loadWebFeed(tab: WebFeedTab): Promise<WebFeedResult> {
  if (!isSupabaseConfigured()) return { state: "signedOut" };

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "signedOut" };

  try {
    // 1) Rank: ordered post ids from a safe, definer-protected ranker.
    let ids: string[] = [];

    if (tab === "following") {
      // Following = recent posts from creators the viewer follows. RLS via
      // posts_viewer_safe still enforces readability; an empty follow set is a
      // clean empty state, not an error.
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .limit(2000);
      const followed = [
        ...new Set(
          ((follows ?? []) as { following_id: string }[])
            .map((f) => f.following_id)
            .filter((v): v is string => Boolean(v)),
        ),
      ];
      if (followed.length === 0) return { state: "ok", posts: [] };

      const { data, error } = await supabase
        .from("posts_viewer_safe")
        .select("id, created_at")
        .in("creator_id", followed)
        .order("created_at", { ascending: false })
        .limit(FEED_LIMIT);
      if (error) throw error;
      ids = ((data ?? []) as { id: string }[]).map((r) => r.id).filter((v): v is string => Boolean(v));
    } else if (tab === "top") {
      // Top = Top Today only. If it's empty we return an empty result so the UI
      // can show a "nothing trending yet" state — we must NOT silently fall back
      // to the personalized For You ranker under a "Top" label.
      const { data, error } = await supabase.rpc("get_top_today_v2", {
        feed_limit: FEED_LIMIT,
        viewer_uuid: user.id,
        exclude_post_ids: [],
      });
      if (!error && Array.isArray(data)) {
        ids = (data as RankRow[]).map((r) => r.post_id).filter((v): v is string => Boolean(v));
      }
    } else {
      const { data, error } = await supabase.rpc("get_ranked_feed_v3", {
        viewer_id: user.id,
        feed_limit: FEED_LIMIT,
        exclude_post_ids: [],
      });
      if (error) throw error;
      ids = ((data as RankRow[]) ?? []).map((r) => r.post_id).filter((v): v is string => Boolean(v));
    }

    if (ids.length === 0) return { state: "ok", posts: [] };

    // 2) Exclusions: blocked users (both directions) + hidden creators/posts.
    const hiddenPosts = new Set<string>();
    const hiddenCreators = new Set<string>();
    try {
      const { data: ex } = await supabase.rpc("get_feed_exclusions", { viewer_uuid: user.id });
      if (ex && typeof ex === "object") {
        const obj = ex as { hidden_post_ids?: unknown; hidden_creator_ids?: unknown };
        if (Array.isArray(obj.hidden_post_ids)) {
          for (const p of obj.hidden_post_ids) if (typeof p === "string") hiddenPosts.add(p);
        }
        if (Array.isArray(obj.hidden_creator_ids)) {
          for (const c of obj.hidden_creator_ids) if (typeof c === "string") hiddenCreators.add(c);
        }
      }
    } catch {
      /* exclusions are best-effort; the ranker already excludes blocks server-side */
    }

    // 3) Hydrate rows via the viewer-safe view (masks anonymous creator ids,
    //    enforces row-level readability).
    const { data: rows, error: rowsErr } = await supabase
      .from("posts_viewer_safe")
      .select("*")
      .in("id", ids);
    if (rowsErr) throw rowsErr;

    type SafeRow = Record<string, unknown> & { id: string };
    const byId = new Map<string, SafeRow>();
    for (const r of (rows ?? []) as SafeRow[]) byId.set(r.id, r);

    // 4) Re-apply rank order + privacy / processing / exclusion filters.
    const ordered: SafeRow[] = [];
    for (const id of ids) {
      const r = byId.get(id);
      if (!r) continue;
      if (hiddenPosts.has(r.id)) continue;
      const creatorId = typeof r.creator_id === "string" ? r.creator_id : null;
      if (creatorId && hiddenCreators.has(creatorId)) continue;

      const sched = String(r.scheduled_status ?? "live").toLowerCase();
      if (sched !== "live") continue;

      const proc = String(r.media_processing_status ?? "").toLowerCase().trim();
      if (PROCESSING_BLOCK.has(proc)) continue;

      const privacy = String(r.privacy_mode ?? "public").toLowerCase();
      if (!PUBLIC_PRIVACY.has(privacy)) continue;

      ordered.push(r);
    }

    // 5) Hydrate authors for non-anonymous posts only.
    const creatorIds = [
      ...new Set(
        ordered
          .filter((r) => !r.is_anonymous && typeof r.creator_id === "string")
          .map((r) => r.creator_id as string),
      ),
    ];
    const profiles = new Map<string, { display_name: string | null; username: string | null; avatar_url: string | null }>();
    if (creatorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", creatorIds);
      for (const p of (profs ?? []) as { id: string; display_name: string | null; username: string | null; avatar_url: string | null }[]) {
        profiles.set(p.id, p);
      }
    }

    const [likedSet, followingSet] = await Promise.all([
      loadLikedPostIds(supabase, user.id, ordered.map((r) => r.id)),
      loadFollowingIds(supabase, user.id, creatorIds),
    ]);

    const posts: WebFeedPost[] = ordered.map((r) => {
      const creatorId = typeof r.creator_id === "string" ? r.creator_id : null;
      // Anonymous when flagged OR when the safe view masked the creator id.
      const anon = Boolean(r.is_anonymous) || !creatorId;
      const prof = !anon && creatorId ? profiles.get(creatorId) : null;
      return {
        id: r.id,
        type: String(r.type ?? "post"),
        caption: typeof r.caption === "string" ? r.caption : null,
        mediaUrl: toHttps(r.media_url),
        thumbnailUrl: toHttps(r.thumbnail_url),
        createdAt: typeof r.created_at === "string" ? r.created_at : null,
        isAnonymous: anon,
        isVideo: isVideoType(r.type),
        author: anon
          ? null
          : {
              id: creatorId,
              displayName: prof?.display_name?.trim() || prof?.username || "PulseVerse member",
              username: prof?.username ?? null,
              avatarUrl: toHttps(prof?.avatar_url),
            },
        likeCount: Number(r.like_count ?? 0) || 0,
        commentCount: Number(r.comment_count ?? 0) || 0,
        likedByViewer: likedSet.has(r.id),
        authorFollowedByViewer: !anon && creatorId ? followingSet.has(creatorId) : false,
      };
    });

    return { state: "ok", posts };
  } catch {
    return { state: "error" };
  }
}
