import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

import { loadLikedPostIds } from "./engagement-data";
import type { WebFeedPost } from "./feed-data";
import { isVideoType, toHttps } from "./format";

/** Posts still rendering / failed must never surface on web. */
const PROCESSING_BLOCK = new Set(["queued", "running", "failed"]);
/** Only public / aliased posts are visible to other viewers. */
const PUBLIC_PRIVACY = new Set(["public", "alias"]);

/** Sentinel id the viewer-safe views emit for masked (anonymous) authors. */
export const ANON_SENTINEL = "00000000-0000-0000-0000-000000000001";

/** Slugs whose author identity is shown only as a stable pseudonym (no profile links). */
const CONFESSION_SLUGS = new Set(["confessions"]);

export function normalizeCircleSlug(slug: string): string {
  const s = slug.trim().toLowerCase();
  if (s === "shift-confessions") return "confessions";
  return s;
}

export function isConfessionCircle(slug: string | null | undefined): boolean {
  if (!slug) return false;
  // Normalize first so the legacy `shift-confessions` slug masks identities too.
  return CONFESSION_SLUGS.has(normalizeCircleSlug(slug));
}

const ADJECTIVES = [
  "Quiet", "Swift", "Calm", "Bright", "Gentle", "Bold", "Kind", "Wise", "Steady", "Soft",
  "Cosmic", "Neon", "Velvet", "Silver", "Golden", "Midnight", "Sunny", "Misty", "Brave", "Clever",
  "Curious", "Sleepy", "Lucky", "Mellow", "Electric", "Hidden", "Wild", "Serene", "Fierce", "Humble",
  "Nimble", "Noble", "Playful", "Silent", "Radiant", "Dusky", "Crystal", "Stormy", "Icy", "Warm",
];
const NOUNS = [
  "Owl", "Robin", "Heron", "Fox", "Raven", "Lark", "Jay", "Wren", "Finch", "Dove",
  "Otter", "Panda", "Koala", "Lynx", "Badger", "Hawk", "Swan", "Crane", "Seal", "Wolf",
  "Comet", "Nova", "Pebble", "River", "Cedar", "Willow", "Maple", "Brook", "Summit", "Echo",
  "Cipher", "Pixel", "Shadow", "Beacon", "Drift", "Pulse", "Glyph", "Quartz", "Nimbus", "Aurora",
];

function hash32(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Stable pseudonym for a masked author within one thread/reply (mirrors the RN app). */
export function anonymousDisplayName(authorId: string, seedId: string): string {
  const h = hash32(`${authorId}:${seedId}`);
  return `Anonymous ${ADJECTIVES[h % ADJECTIVES.length]} ${NOUNS[(h >> 4) % NOUNS.length]}`;
}

export type WebCircle = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  memberCount: number;
  postCount: number;
  isPinned: boolean;
};

export type WebCircleAuthor = {
  /** `null` for anonymous / masked authors — never linkable. */
  id: string | null;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};

export type WebCircleThread = {
  id: string;
  kind: string | null;
  title: string | null;
  body: string | null;
  mediaThumbUrl: string | null;
  isVideo: boolean;
  replyCount: number;
  reactionCount: number;
  shareCount: number;
  createdAt: string | null;
  isAnonymous: boolean;
  author: WebCircleAuthor | null;
};

export type WebCircleReply = {
  id: string;
  body: string | null;
  createdAt: string | null;
  reactionCount: number;
  isAnonymous: boolean;
  author: WebCircleAuthor | null;
};

export type WebCirclesIndexResult =
  | { state: "error" }
  | { state: "ok"; circles: WebCircle[] };

export type WebCircleDetailResult =
  | { state: "error" }
  | { state: "unavailable" }
  | {
      state: "ok";
      circle: WebCircle;
      isConfession: boolean;
      threads: WebCircleThread[];
      wallPosts: WebFeedPost[];
      /** Whether the signed-in viewer has joined this Circle. */
      isMember: boolean;
    };

export type WebCircleThreadResult =
  | { state: "error" }
  | { state: "unavailable" }
  | {
      state: "ok";
      circle: WebCircle;
      isConfession: boolean;
      thread: WebCircleThread;
      replies: WebCircleReply[];
      /** Whether the viewer is a member and may post a reply (RLS requires membership). */
      canReply: boolean;
    };

type AnyRow = Record<string, unknown>;
type Supa = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapCircle(row: AnyRow): WebCircle {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: str(row.name) || String(row.slug),
    description: str(row.description),
    icon: str(row.icon),
    memberCount: num(row.member_count),
    postCount: num(row.post_count),
    isPinned: row.featured_order != null,
  };
}

/** Blocked / hidden creators for the signed-in viewer (best-effort). */
export async function loadHiddenCreators(supabase: Supa, viewerId: string): Promise<Set<string>> {
  const hidden = new Set<string>();
  try {
    const { data } = await supabase.rpc("get_feed_exclusions", { viewer_uuid: viewerId });
    if (data && typeof data === "object") {
      const obj = data as { hidden_creator_ids?: unknown };
      if (Array.isArray(obj.hidden_creator_ids)) {
        for (const c of obj.hidden_creator_ids) if (typeof c === "string") hidden.add(c);
      }
    }
  } catch {
    /* best-effort */
  }
  return hidden;
}

/** Batch-hydrate real (non-masked) author profiles. */
export async function hydrateAuthors(supabase: Supa, ids: string[]): Promise<Map<string, AnyRow>> {
  const map = new Map<string, AnyRow>();
  const real = [...new Set(ids.filter((id) => id && id !== ANON_SENTINEL))];
  if (real.length === 0) return map;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", real);
    for (const p of (data ?? []) as AnyRow[]) map.set(String(p.id), p);
  } catch {
    /* best-effort */
  }
  return map;
}

function buildAuthor(
  rawAuthorId: string | null,
  seedId: string,
  isConfession: boolean,
  profiles: Map<string, AnyRow>,
): WebCircleAuthor | null {
  // Confession rooms: always a pseudonym, never a profile link.
  if (isConfession) {
    return {
      id: null,
      displayName: anonymousDisplayName(rawAuthorId ?? ANON_SENTINEL, seedId),
      username: null,
      avatarUrl: null,
    };
  }
  // Masked author with no profile context → generic anonymous label.
  if (!rawAuthorId || rawAuthorId === ANON_SENTINEL) {
    return { id: null, displayName: "Anonymous", username: null, avatarUrl: null };
  }
  const prof = profiles.get(rawAuthorId);
  return {
    id: rawAuthorId,
    displayName: str(prof?.display_name) || str(prof?.username) || "PulseVerse member",
    username: str(prof?.username),
    avatarUrl: toHttps(prof?.avatar_url),
  };
}

export async function loadCirclesIndex(): Promise<WebCirclesIndexResult> {
  if (!isSupabaseConfigured()) return { state: "error" };
  let supabase: Supa;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }
  try {
    const { data, error } = await supabase
      .from("communities")
      .select("id, slug, name, description, icon, member_count, post_count, featured_order")
      .order("featured_order", { ascending: true, nullsFirst: false })
      .order("member_count", { ascending: false })
      .limit(40);
    if (error) return { state: "error" };
    return { state: "ok", circles: ((data ?? []) as AnyRow[]).map(mapCircle) };
  } catch {
    return { state: "error" };
  }
}

/**
 * Whether `viewerId` has joined `communityId`. Posting RLS on circle threads /
 * replies requires membership (`is_member_of_community`), so the web mirrors the
 * check up-front to show the right affordance instead of a failed insert.
 */
export async function isCircleMember(
  supabase: Supa,
  communityId: string,
  viewerId: string,
): Promise<boolean> {
  if (!communityId || !viewerId) return false;
  try {
    const { data } = await supabase
      .from("community_members")
      .select("user_id")
      .eq("community_id", communityId)
      .eq("user_id", viewerId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

async function fetchCircleBySlug(supabase: Supa, slug: string): Promise<WebCircle | null> {
  const normalized = normalizeCircleSlug(slug);
  const { data, error } = await supabase
    .from("communities")
    .select("id, slug, name, description, icon, member_count, post_count, featured_order")
    .eq("slug", normalized)
    .maybeSingle();
  if (error || !data) return null;
  return mapCircle(data as AnyRow);
}

async function loadCircleWallPosts(
  supabase: Supa,
  communityId: string,
  isConfession: boolean,
  hidden: Set<string>,
  viewerId: string,
): Promise<WebFeedPost[]> {
  try {
    const { data } = await supabase
      .from("posts_viewer_safe")
      .select("*")
      .contains("communities", [communityId])
      .order("created_at", { ascending: false })
      .limit(18);

    const rows = ((data ?? []) as AnyRow[]).filter((r) => {
      const sched = String(r.scheduled_status ?? "live").toLowerCase();
      if (sched !== "live") return false;
      const proc = String(r.media_processing_status ?? "").toLowerCase().trim();
      if (PROCESSING_BLOCK.has(proc)) return false;
      const privacy = String(r.privacy_mode ?? "public").toLowerCase();
      if (!PUBLIC_PRIVACY.has(privacy)) return false;
      const creator = typeof r.creator_id === "string" ? r.creator_id : null;
      if (creator && hidden.has(creator)) return false;
      return true;
    });

    // Hydrate authors only for non-anonymous, non-confession posts.
    const profiles = isConfession
      ? new Map<string, AnyRow>()
      : await hydrateAuthors(
          supabase,
          rows
            .filter((r) => !r.is_anonymous && typeof r.creator_id === "string")
            .map((r) => r.creator_id as string),
        );

    const likedSet = await loadLikedPostIds(supabase, viewerId, rows.map((r) => String(r.id)));

    return rows.map((r) => {
      const creatorId = typeof r.creator_id === "string" ? r.creator_id : null;
      // Confession rooms + masked creators + flagged posts are all anonymous.
      const anon = isConfession || Boolean(r.is_anonymous) || !creatorId || creatorId === ANON_SENTINEL;
      const prof = !anon && creatorId ? profiles.get(creatorId) : null;
      return {
        id: String(r.id),
        type: String(r.type ?? "post"),
        caption: str(r.caption),
        mediaUrl: toHttps(r.media_url),
        thumbnailUrl: toHttps(r.thumbnail_url),
        createdAt: str(r.created_at),
        isAnonymous: anon,
        isVideo: isVideoType(r.type),
        author: anon
          ? null
          : {
              id: creatorId,
              displayName: str(prof?.display_name) || str(prof?.username) || "PulseVerse member",
              username: str(prof?.username),
              avatarUrl: toHttps(prof?.avatar_url),
            },
        likeCount: num(r.like_count),
        commentCount: num(r.comment_count),
        likedByViewer: likedSet.has(String(r.id)),
        // Circle wall cards don't surface a follow control; follow happens on the Pulse Page.
        authorFollowedByViewer: false,
      };
    });
  } catch {
    return [];
  }
}

export async function loadCircleDetail(slug: string, viewerId: string): Promise<WebCircleDetailResult> {
  if (!isSupabaseConfigured()) return { state: "error" };
  let supabase: Supa;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }
  try {
    const circle = await fetchCircleBySlug(supabase, slug);
    if (!circle) return { state: "unavailable" };
    const isConf = isConfessionCircle(circle.slug);

    // One exclusions lookup shared across threads + wall posts.
    const hidden = await loadHiddenCreators(supabase, viewerId);

    const [{ data: threadRows, error: threadsErr }, wallPosts, isMember] = await Promise.all([
      supabase
        .from("circle_threads_viewer_safe")
        .select("*")
        .eq("community_id", circle.id)
        .eq("moderation_status", "active")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(48),
      loadCircleWallPosts(supabase, circle.id, isConf, hidden, viewerId),
      isCircleMember(supabase, circle.id, viewerId),
    ]);
    if (threadsErr) return { state: "error" };

    const rows = ((threadRows ?? []) as AnyRow[]).filter((r) => {
      const author = typeof r.author_id === "string" ? r.author_id : null;
      return !(author && hidden.has(author));
    });

    const profiles = isConf
      ? new Map<string, AnyRow>()
      : await hydrateAuthors(
          supabase,
          rows.map((r) => (typeof r.author_id === "string" ? r.author_id : "")).filter(Boolean),
        );

    const threads: WebCircleThread[] = rows.map((r) => {
      const id = String(r.id);
      const rawAuthor = typeof r.author_id === "string" ? r.author_id : null;
      return {
        id,
        kind: str(r.kind),
        title: str(r.title),
        body: str(r.body),
        mediaThumbUrl: toHttps(r.media_thumb_url),
        isVideo: isVideoType(r.kind),
        replyCount: num(r.reply_count),
        reactionCount: num(r.reaction_count),
        shareCount: num(r.share_count),
        createdAt: str(r.created_at),
        isAnonymous: isConf,
        author: buildAuthor(rawAuthor, id, isConf, profiles),
      };
    });

    return { state: "ok", circle, isConfession: isConf, threads, wallPosts, isMember };
  } catch {
    return { state: "error" };
  }
}

export async function loadCircleThread(
  slug: string,
  threadId: string,
  viewerId: string,
): Promise<WebCircleThreadResult> {
  if (!isSupabaseConfigured()) return { state: "error" };
  let supabase: Supa;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }
  try {
    const circle = await fetchCircleBySlug(supabase, slug);
    if (!circle) return { state: "unavailable" };
    const isConf = isConfessionCircle(circle.slug);

    const { data: threadRow, error: threadErr } = await supabase
      .from("circle_threads_viewer_safe")
      .select("*")
      .eq("id", threadId)
      .maybeSingle();
    if (threadErr) return { state: "error" };
    if (!threadRow) return { state: "unavailable" };
    const tRow = threadRow as AnyRow;
    // Thread must belong to this circle, be active, and not deleted.
    if (String(tRow.community_id) !== circle.id) return { state: "unavailable" };
    if (String(tRow.moderation_status ?? "active") !== "active" || tRow.deleted_at != null) {
      return { state: "unavailable" };
    }

    const hidden = await loadHiddenCreators(supabase, viewerId);
    const threadAuthor = typeof tRow.author_id === "string" ? tRow.author_id : null;
    if (threadAuthor && hidden.has(threadAuthor)) return { state: "unavailable" };

    const [{ data: replyRows }, canReply] = await Promise.all([
      supabase
        .from("circle_replies_viewer_safe")
        .select("*")
        .eq("thread_id", threadId)
        .eq("moderation_status", "active")
        .order("created_at", { ascending: true })
        .limit(100),
      isCircleMember(supabase, circle.id, viewerId),
    ]);

    const filteredReplies = ((replyRows ?? []) as AnyRow[]).filter((r) => {
      const a = typeof r.author_id === "string" ? r.author_id : null;
      return !(a && hidden.has(a));
    });

    const authorIds = [
      threadAuthor ?? "",
      ...filteredReplies.map((r) => (typeof r.author_id === "string" ? r.author_id : "")),
    ].filter(Boolean);
    const profiles = isConf ? new Map<string, AnyRow>() : await hydrateAuthors(supabase, authorIds);

    const thread: WebCircleThread = {
      id: String(tRow.id),
      kind: str(tRow.kind),
      title: str(tRow.title),
      body: str(tRow.body),
      mediaThumbUrl: toHttps(tRow.media_thumb_url),
      isVideo: isVideoType(tRow.kind),
      replyCount: num(tRow.reply_count),
      reactionCount: num(tRow.reaction_count),
      shareCount: num(tRow.share_count),
      createdAt: str(tRow.created_at),
      isAnonymous: isConf,
      author: buildAuthor(threadAuthor, String(tRow.id), isConf, profiles),
    };

    const replies: WebCircleReply[] = filteredReplies.map((r) => {
      const id = String(r.id);
      const rawAuthor = typeof r.author_id === "string" ? r.author_id : null;
      return {
        id,
        body: str(r.body),
        createdAt: str(r.created_at),
        reactionCount: num(r.reaction_count),
        isAnonymous: isConf,
        author: buildAuthor(rawAuthor, id, isConf, profiles),
      };
    });

    return { state: "ok", circle, isConfession: isConf, thread, replies, canReply };
  } catch {
    return { state: "error" };
  }
}

export type WebMyCircle = WebCircle & { joinedAt: string | null };

/**
 * Circles the signed-in viewer has joined (`community_members`), most-recent
 * first. RLS lets a user read their own membership rows; we then batch-load the
 * community details. Deleted/hidden communities simply drop out (no row).
 */
export async function loadMyCircles(viewerId: string): Promise<WebMyCircle[]> {
  if (!isSupabaseConfigured() || !viewerId) return [];
  let supabase: Supa;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return [];
  }
  try {
    const { data: memberships, error } = await supabase
      .from("community_members")
      .select("community_id, joined_at")
      .eq("user_id", viewerId)
      .order("joined_at", { ascending: false })
      .limit(60);
    if (error) return [];

    const order: string[] = [];
    const joinedAt = new Map<string, string | null>();
    for (const m of (memberships ?? []) as AnyRow[]) {
      const id = typeof m.community_id === "string" ? m.community_id : null;
      if (!id || joinedAt.has(id)) continue;
      order.push(id);
      joinedAt.set(id, str(m.joined_at));
    }
    if (order.length === 0) return [];

    const { data: communities } = await supabase
      .from("communities")
      .select("id, slug, name, description, icon, member_count, post_count, featured_order")
      .in("id", order);

    const byId = new Map<string, WebCircle>();
    for (const row of (communities ?? []) as AnyRow[]) byId.set(String(row.id), mapCircle(row));

    // Preserve membership recency order; drop any community that no longer exists.
    return order
      .map((id) => {
        const circle = byId.get(id);
        return circle ? { ...circle, joinedAt: joinedAt.get(id) ?? null } : null;
      })
      .filter((c): c is WebMyCircle => c !== null);
  } catch {
    return [];
  }
}
