import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

import { loadFollowingIds, loadLikedPostIds, loadLikedProfileUpdateIds } from "./engagement-data";
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
  userId: string;
  type: string;
  content: string | null;
  previewText: string | null;
  mood: string | null;
  picsUrls: string[];
  mediaThumb: string | null;
  linkedUrl: string | null;
  isPinned: boolean;
  createdAt: string | null;
  likeCount: number;
  commentCount: number;
  likedByViewer?: boolean;
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

/** One tile in the Media Hub (feed post or My Pulse pic). */
export type WebMediaItem = {
  key: string;
  postId?: string;
  pulseUpdateId?: string;
  thumbnailUrl: string | null;
  imageUrl?: string | null;
  isVideo: boolean;
  caption: string | null;
  likeCount: number;
  commentCount?: number;
  sourceLabel?: string;
  isAnonymous?: boolean;
  likedByViewer?: boolean;
};

/** Media Hub library, split into the same three tabs as the native app. */
export type WebProfileMedia = {
  videos: WebMediaItem[];
  photos: WebMediaItem[];
  /** Owner-only (saved posts are private); empty for visitors. */
  favorites: WebMediaItem[];
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
      media: WebProfileMedia;
    };

const POSTS_LIMIT = 30;
const PULSE_LIMIT = 5;
/** Media still rendering / failed must never surface on web. */
const PROCESSING_BLOCK = new Set(["queued", "running", "failed"]);
/** Only public / aliased posts are visible to other viewers. */
const PUBLIC_PRIVACY = new Set(["public", "alias"]);

const FRAME_EMBED =
  "pulse_avatar_frame:pulse_avatar_frames!profiles_selected_pulse_avatar_frame_id_fkey(slug, label, prize_tier, ring_color, glow_color, ring_caption)";

// Explicit profile column list (excludes role_admin so signed-out/anon profile
// reads never carry the staff flag). push_token columns were removed in
// migration 243. Keep in sync with public.profiles.
const PROFILE_COLUMNS =
  "avatar_url, banner_url, bio, brand_kit, city, created_at, default_allow_clip_downloads, default_allow_remix, default_allow_viewer_clips, display_name, first_name, follower_count, following_count, hide_pulse_music_player_on_my_page, id, identity_tags, is_creator, is_verified, last_name, like_count, post_count, preferred_locale, privacy_mode, product_digest_email, profile_song_artist, profile_song_artwork_url, profile_song_title, profile_song_url, pulse_score_current, pulse_tier, role, selected_pulse_avatar_frame_id, shift_preference, specialty, state, terms_and_privacy_accepted_at, total_shares, updated_at, username, years_experience";

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
      .select(`${PROFILE_COLUMNS}, ${FRAME_EMBED}`)
      .eq("id", targetUserId)
      .maybeSingle();

    if (profileErr) {
      // The embed can fail on schema drift — retry without it before giving up.
      const fallback = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", targetUserId).maybeSingle();
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
      media: { videos: [], photos: [], favorites: [] },
    };
  }

  const canFollow = !isOwner;
  const [pulseUpdates, posts, favorites, pulsePicPhotos, followingSet] = await Promise.all([
    loadPulseUpdates(supabase, targetUserId, viewerId),
    loadProfilePosts(supabase, targetUserId, isOwner, viewerId),
    // Saved posts are private — only the owner's Favorites tab is populated.
    isOwner ? loadFavorites(supabase, targetUserId, viewerId) : Promise.resolve<WebMediaItem[]>([]),
    loadPulsePicPhotos(supabase, targetUserId, viewerId),
    canFollow ? loadFollowingIds(supabase, viewerId, [targetUserId]) : Promise.resolve(new Set<string>()),
  ]);

  // Split the user's own feed/circle posts into the Videos and Photos tabs,
  // mirroring the native Media Hub (which keys off post.type).
  const videos = posts.filter((p) => p.isVideo).map(mediaItemFromPost);
  const postPhotos = posts.filter((p) => !p.isVideo && p.type === "image").map(mediaItemFromPost);
  const seenPhotoUrls = new Set<string>();
  const photos: WebMediaItem[] = [];
  for (const item of [...postPhotos, ...pulsePicPhotos]) {
    const url = (item.imageUrl ?? item.thumbnailUrl)?.trim();
    if (!url || seenPhotoUrls.has(url)) continue;
    seenPhotoUrls.add(url);
    photos.push(item);
    if (photos.length >= 40) break;
  }

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
    media: { videos, photos, favorites },
  };
}

/** Project a profile post into a Media Hub tile. */
function mediaItemFromPost(p: WebProfilePost): WebMediaItem {
  return {
    key: `post:${p.id}`,
    postId: p.id,
    thumbnailUrl: p.thumbnailUrl ?? p.mediaUrl,
    imageUrl: p.mediaUrl ?? p.thumbnailUrl,
    isVideo: p.isVideo,
    caption: p.caption,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    sourceLabel: "Feed post",
    likedByViewer: p.likedByViewer,
  };
}

/** My Pulse `pics` updates → Media Hub Photos tab (mirrors native MediaHubSection). */
async function loadPulsePicPhotos(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  viewerId: string,
): Promise<WebMediaItem[]> {
  try {
    const { data } = await supabase
      .from("profile_updates")
      .select(
        "id, type, content, preview_text, pics_urls, media_thumb, linked_url, like_count, comment_count",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);

    const out: WebMediaItem[] = [];
    for (const r of (data ?? []) as AnyRow[]) {
      const type = String(r.type ?? "");
      const linkedUrl = str(r.linked_url);
      const isPicsRow = type === "pics" || (type === "media_note" && !linkedUrl);
      if (!isPicsRow) continue;

      const urls: string[] = [];
      if (Array.isArray(r.pics_urls)) {
        for (const u of r.pics_urls) {
          if (typeof u === "string" && u.trim()) urls.push(u.trim());
        }
      }
      if (urls.length === 0) {
        const thumb = toHttps(r.media_thumb);
        if (thumb) urls.push(thumb);
      }

      const caption = str(r.content) ?? str(r.preview_text);
      for (let i = 0; i < urls.length; i++) {
        out.push({
          key: `pulse:${String(r.id)}:${i}`,
          pulseUpdateId: String(r.id),
          thumbnailUrl: urls[i],
          imageUrl: urls[i],
          isVideo: false,
          caption,
          likeCount: num(r.like_count),
          commentCount: num(r.comment_count),
          sourceLabel: "My Pulse",
        });
      }
    }
    if (viewerId && out.length > 0) {
      const updateIds = [...new Set(out.map((item) => item.pulseUpdateId).filter(Boolean))] as string[];
      const likedSet = await loadLikedProfileUpdateIds(supabase, viewerId, updateIds);
      for (const item of out) {
        if (item.pulseUpdateId) {
          item.likedByViewer = likedSet.has(item.pulseUpdateId);
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Owner's saved posts → Media Hub Favorites tab. `saved_posts` is RLS-scoped to
 * the owner; we then re-read the actual rows through `posts_viewer_safe` so only
 * still-live, non-processing posts surface (mirrors the native Favorites grid).
 */
async function loadFavorites(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  viewerId: string,
): Promise<WebMediaItem[]> {
  try {
    const { data: saved } = await supabase
      .from("saved_posts")
      .select("post_id, saved_at")
      .eq("user_id", userId)
      .order("saved_at", { ascending: false })
      .limit(40);
    const order = ((saved ?? []) as AnyRow[])
      .map((r) => (typeof r.post_id === "string" ? r.post_id : null))
      .filter((id): id is string => Boolean(id));
    if (order.length === 0) return [];

    const { data: postRows } = await supabase
      .from("posts_viewer_safe")
      .select("id, type, caption, thumbnail_url, media_url, like_count, scheduled_status, media_processing_status")
      .in("id", order);

    const byId = new Map<string, WebMediaItem>();
    const postIds: string[] = [];
    for (const r of (postRows ?? []) as AnyRow[]) {
      const sched = String(r.scheduled_status ?? "live").toLowerCase();
      if (sched !== "live") continue;
      const proc = String(r.media_processing_status ?? "").toLowerCase().trim();
      if (PROCESSING_BLOCK.has(proc)) continue;
      const id = String(r.id);
      postIds.push(id);
      byId.set(id, {
        key: `fav:${id}`,
        postId: id,
        thumbnailUrl: toHttps(r.thumbnail_url) ?? toHttps(r.media_url),
        imageUrl: toHttps(r.media_url) ?? toHttps(r.thumbnail_url),
        isVideo: isVideoType(r.type),
        caption: str(r.caption),
        likeCount: num(r.like_count),
        sourceLabel: "Feed post",
      });
    }
    const likedSet = viewerId ? await loadLikedPostIds(supabase, viewerId, postIds) : new Set<string>();
    for (const item of byId.values()) {
      if (item.postId) item.likedByViewer = likedSet.has(item.postId);
    }
    // Preserve saved-at order; drop any post no longer visible.
    return order.map((id) => byId.get(id)).filter((m): m is WebMediaItem => Boolean(m));
  } catch {
    return [];
  }
}

async function loadPulseUpdates(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  viewerId: string,
): Promise<WebPulseUpdate[]> {
  try {
    const { data } = await supabase
      .from("profile_updates")
      .select(
        "id, user_id, type, content, preview_text, mood, pics_urls, media_thumb, linked_url, is_pinned, created_at, like_count, comment_count",
      )
      .eq("user_id", userId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(PULSE_LIMIT);
    const rows = (data ?? []) as AnyRow[];
    const likedSet =
      viewerId && rows.length > 0
        ? await loadLikedProfileUpdateIds(
            supabase,
            viewerId,
            rows.map((r) => String(r.id)),
          )
        : new Set<string>();
    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      type: String(r.type ?? "thought"),
      content: str(r.content),
      previewText: str(r.preview_text),
      mood: str(r.mood),
      picsUrls: Array.isArray(r.pics_urls)
        ? r.pics_urls.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
        : [],
      mediaThumb: toHttps(r.media_thumb),
      linkedUrl: str(r.linked_url),
      isPinned: Boolean(r.is_pinned),
      createdAt: str(r.created_at),
      likeCount: num(r.like_count),
      commentCount: num(r.comment_count),
      likedByViewer: likedSet.has(String(r.id)),
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
