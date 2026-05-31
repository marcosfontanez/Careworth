import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

import { loadFollowingIds, loadLikedPostIds } from "./engagement-data";
import { isVideoType, toHttps } from "./format";

export type WebProfileFrame = {
  slug: string | null;
  label: string | null;
  ringColor: string | null;
  glowColor: string | null;
  ringCaption: string | null;
  prizeTier: string | null;
};

export type WebProfileHeader = {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  identityTags: string[];
  frame: WebProfileFrame | null;
  stats: {
    followers: number;
    following: number;
    pulseScore: number;
    pulseTier: string | null;
  };
};

export type WebPulseUpdate = {
  id: string;
  type: string;
  content: string | null;
  previewText: string | null;
  mood: string | null;
  isPinned: boolean;
  createdAt: string | null;
  likeCount: number;
  commentCount: number;
};

export type WebProfilePost = {
  id: string;
  type: string;
  caption: string | null;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  isVideo: boolean;
  createdAt: string | null;
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
};

/** Why a profile's content is hidden even though the shell can render. */
export type WebProfileLockReason = "private" | "blocked" | null;

export type WebProfileResult =
  | { state: "signedOut" }
  | { state: "error" }
  | { state: "unavailable" }
  | {
      state: "ok";
      isOwner: boolean;
      contentVisible: boolean;
      lockReason: WebProfileLockReason;
      /** Visitor may follow this profile (not owner, content visible, not blocked). */
      canFollow: boolean;
      isFollowing: boolean;
      profile: WebProfileHeader;
      pulseUpdates: WebPulseUpdate[];
      posts: WebProfilePost[];
    };

const POSTS_LIMIT = 30;
const PULSE_LIMIT = 5;
/** Media still rendering / failed must never surface on web. */
const PROCESSING_BLOCK = new Set(["queued", "running", "failed"]);
/** Only public / aliased posts are visible to other viewers. */
const PUBLIC_PRIVACY = new Set(["public", "alias"]);

const FRAME_EMBED =
  "pulse_avatar_frame:pulse_avatar_frames!profiles_selected_pulse_avatar_frame_id_fkey(slug, label, prize_tier, ring_color, glow_color, ring_caption)";

type AnyRow = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapFrame(raw: unknown): WebProfileFrame | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as AnyRow;
  return {
    slug: str(f.slug),
    label: str(f.label),
    ringColor: str(f.ring_color),
    glowColor: str(f.glow_color),
    ringCaption: str(f.ring_caption),
    prizeTier: str(f.prize_tier),
  };
}

function mapHeader(row: AnyRow): WebProfileHeader {
  const display = str(row.display_name) || str(row.username) || "PulseVerse member";
  return {
    id: String(row.id),
    displayName: display,
    username: str(row.username),
    avatarUrl: toHttps(row.avatar_url),
    bannerUrl: toHttps(row.banner_url),
    bio: str(row.bio),
    isVerified: Boolean(row.is_verified),
    identityTags: Array.isArray(row.identity_tags)
      ? (row.identity_tags as unknown[]).filter((t): t is string => typeof t === "string" && t.trim().length > 0).slice(0, 6)
      : [],
    frame: mapFrame(row.pulse_avatar_frame),
    stats: {
      followers: num(row.follower_count),
      following: num(row.following_count),
      pulseScore: num(row.pulse_score_current),
      pulseTier: str(row.pulse_tier),
    },
  };
}

/**
 * Load a Pulse Page for the web. `viewerId` is the signed-in account viewing it;
 * `targetUserId` is whose profile we render. Owner sees their own content; a
 * visitor sees only public-safe content with anonymous/private/blocked rules.
 */
export async function loadWebProfile(
  targetUserId: string,
  viewerId: string,
): Promise<WebProfileResult> {
  if (!isSupabaseConfigured()) return { state: "signedOut" };

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }

  const isOwner = targetUserId === viewerId;

  try {
    const { data: profileRow, error: profileErr } = await supabase
      .from("profiles")
      .select(`*, ${FRAME_EMBED}`)
      .eq("id", targetUserId)
      .maybeSingle();

    if (profileErr) {
      // The embed can fail on schema drift — retry without it before giving up.
      const fallback = await supabase.from("profiles").select("*").eq("id", targetUserId).maybeSingle();
      if (fallback.error) return { state: "error" };
      if (!fallback.data) return { state: "unavailable" };
      return finalize(supabase, mapHeader(fallback.data as AnyRow), isOwner, viewerId, targetUserId);
    }
    if (!profileRow) return { state: "unavailable" };

    return finalize(supabase, mapHeader(profileRow as AnyRow), isOwner, viewerId, targetUserId);
  } catch {
    return { state: "error" };
  }
}

async function finalize(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  profile: WebProfileHeader,
  isOwner: boolean,
  viewerId: string,
  targetUserId: string,
): Promise<WebProfileResult> {
  let contentVisible = true;
  let lockReason: WebProfileLockReason = null;

  if (!isOwner) {
    // Block relationship — both directions. (blocked_users is participant-readable.)
    try {
      const { data: blocks } = await supabase
        .from("blocked_users")
        .select("blocker_id, blocked_id")
        .or(
          `and(blocker_id.eq.${viewerId},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${viewerId})`,
        )
        .limit(2);
      for (const b of (blocks ?? []) as { blocker_id: string; blocked_id: string }[]) {
        // Owner blocked the viewer → the viewer must not browse this profile at all.
        if (b.blocker_id === targetUserId && b.blocked_id === viewerId) {
          return { state: "unavailable" };
        }
        // Viewer blocked the owner → shell loads but content stays hidden.
        if (b.blocker_id === viewerId && b.blocked_id === targetUserId) {
          contentVisible = false;
          lockReason = "blocked";
        }
      }
    } catch {
      /* best-effort; default to showing public-safe content */
    }
  }

  // Private accounts: only the owner sees posts / Pulse updates.
  if (!isOwner && contentVisible) {
    try {
      const { data: priv } = await supabase
        .from("profiles")
        .select("privacy_mode")
        .eq("id", targetUserId)
        .maybeSingle();
      const mode = String((priv as AnyRow | null)?.privacy_mode ?? "public").toLowerCase();
      if (mode === "private") {
        contentVisible = false;
        lockReason = "private";
      }
    } catch {
      /* default visible */
    }
  }

  if (!contentVisible) {
    return {
      state: "ok",
      isOwner,
      contentVisible: false,
      lockReason,
      canFollow: false,
      isFollowing: false,
      profile,
      pulseUpdates: [],
      posts: [],
    };
  }

  const canFollow = !isOwner;
  const [pulseUpdates, posts, followingSet] = await Promise.all([
    loadPulseUpdates(supabase, targetUserId),
    loadProfilePosts(supabase, targetUserId, isOwner, viewerId),
    canFollow ? loadFollowingIds(supabase, viewerId, [targetUserId]) : Promise.resolve(new Set<string>()),
  ]);

  return {
    state: "ok",
    isOwner,
    contentVisible: true,
    lockReason: null,
    canFollow,
    isFollowing: followingSet.has(targetUserId),
    profile,
    pulseUpdates,
    posts,
  };
}

async function loadPulseUpdates(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<WebPulseUpdate[]> {
  try {
    const { data } = await supabase
      .from("profile_updates")
      .select("id, type, content, preview_text, mood, is_pinned, created_at, like_count, comment_count")
      .eq("user_id", userId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(PULSE_LIMIT);
    return ((data ?? []) as AnyRow[]).map((r) => ({
      id: String(r.id),
      type: String(r.type ?? "thought"),
      content: str(r.content),
      previewText: str(r.preview_text),
      mood: str(r.mood),
      isPinned: Boolean(r.is_pinned),
      createdAt: str(r.created_at),
      likeCount: num(r.like_count),
      commentCount: num(r.comment_count),
    }));
  } catch {
    return [];
  }
}

async function loadProfilePosts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  isOwner: boolean,
  viewerId: string,
): Promise<WebProfilePost[]> {
  try {
    const { data } = await supabase
      .from("posts_viewer_safe")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false })
      .limit(POSTS_LIMIT);

    const rows = (data ?? []) as AnyRow[];
    const kept: AnyRow[] = [];
    for (const r of rows) {
      const sched = String(r.scheduled_status ?? "live").toLowerCase();
      if (sched !== "live") continue;
      const proc = String(r.media_processing_status ?? "").toLowerCase().trim();
      if (PROCESSING_BLOCK.has(proc)) continue;

      if (!isOwner) {
        if (r.is_anonymous) continue;
        const privacy = String(r.privacy_mode ?? "public").toLowerCase();
        if (!PUBLIC_PRIVACY.has(privacy)) continue;
      }
      kept.push(r);
    }

    const likedSet = await loadLikedPostIds(supabase, viewerId, kept.map((r) => String(r.id)));

    return kept.map((r) => ({
      id: String(r.id),
      type: String(r.type ?? "post"),
      caption: str(r.caption),
      thumbnailUrl: toHttps(r.thumbnail_url),
      mediaUrl: toHttps(r.media_url),
      isVideo: isVideoType(r.type),
      createdAt: str(r.created_at),
      likeCount: num(r.like_count),
      commentCount: num(r.comment_count),
      likedByViewer: likedSet.has(String(r.id)),
    }));
  } catch {
    return [];
  }
}
