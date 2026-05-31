"use server";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ANON_SENTINEL, isConfessionCircle } from "@/lib/web-app/circles-data";
import { loadPostComments, type WebCommentsResult } from "@/lib/web-app/comments-data";

/**
 * Result of a guarded engagement mutation. `active` is the new state
 * (following / liked). On failure, `reason` tells the client how to recover
 * without exposing raw errors.
 */
export type EngagementActionResult =
  | { ok: true; active: boolean }
  | { ok: false; reason: "auth" | "self" | "blocked" | "unavailable" | "error" };

const PROCESSING_BLOCK = new Set(["queued", "running", "failed"]);
/** Only public / aliased posts are commentable by non-owners. */
const PUBLIC_PRIVACY = new Set(["public", "alias"]);
/** Matches the DB CHECK constraint `comments_content_length_300`. */
const COMMENT_MAX_LENGTH = 300;
/** My Pulse thought body cap — mirrors the app's caption max. */
const THOUGHT_MAX_LENGTH = 500;
const MOOD_MAX_LENGTH = 60;

/** Result of creating a My Pulse text update from the web composer. */
export type ThoughtCreateResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "empty" | "tooLong" | "error" };

/** Result of equipping / unequipping a cosmetic border. */
export type EquipBorderResult = { ok: true } | { ok: false; reason: "auth" | "error" };

/**
 * Equip (or, with null, unequip) an owned cosmetic border. Delegates to the
 * `set_selected_pulse_avatar_frame` RPC, which runs as the signed-in user and
 * enforces ownership server-side — the web never writes `selected_pulse_avatar_frame_id`
 * directly, so a user can only equip borders they actually own.
 */
export async function equipBorderAction(frameId: string | null): Promise<EquipBorderResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "error" };
  if (frameId !== null && (typeof frameId !== "string" || !frameId)) {
    return { ok: false, reason: "error" };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };
    const { error } = await supabase.rpc("set_selected_pulse_avatar_frame", { p_frame_id: frameId });
    if (error) return { ok: false, reason: "error" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Result of a notification read mutation. */
export type NotificationReadResult = { ok: true } | { ok: false; reason: "auth" | "error" };

/**
 * Mark a single notification read. RLS scopes `notifications` to the owner; we
 * additionally constrain on `user_id` so the update can never touch another
 * user's row even if RLS were relaxed.
 */
export async function markNotificationReadAction(id: string): Promise<NotificationReadResult> {
  if (!isSupabaseConfigured() || typeof id !== "string" || !id) return { ok: false, reason: "error" };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { ok: false, reason: "error" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Mark all of the signed-in user's notifications read. */
export async function markAllNotificationsReadAction(): Promise<NotificationReadResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "error" };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    if (error) return { ok: false, reason: "error" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Create a text-only "thought" update on the signed-in user's My Pulse.
 * Writes to `profile_updates` as the owner (RLS enforces `user_id = auth.uid()`),
 * mirroring the native `profileUpdatesService.add` shape. Text-only — no media,
 * no links — so there is no upload path and nothing to process.
 */
export async function createWebThoughtAction(input: {
  body: string;
  mood?: string;
}): Promise<ThoughtCreateResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "error" };

  const body = typeof input?.body === "string" ? input.body.trim() : "";
  const mood = typeof input?.mood === "string" ? input.mood.trim() : "";
  if (!body) return { ok: false, reason: "empty" };
  if (body.length > THOUGHT_MAX_LENGTH) return { ok: false, reason: "tooLong" };

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { error } = await supabase.from("profile_updates").insert({
      user_id: user.id,
      type: "thought",
      content: body,
      preview_text: body.slice(0, 160),
      mood: mood ? mood.slice(0, MOOD_MAX_LENGTH) : null,
    });
    if (error) return { ok: false, reason: "error" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Follow / unfollow a profile. Writes directly to `follows` as the signed-in
 * user (RLS enforces `follower_id = auth.uid()`); the DB trigger keeps
 * follower/following counts in sync. Blocked users (either direction) cannot
 * follow each other.
 */
export async function toggleFollowAction(targetUserId: string): Promise<EngagementActionResult> {
  if (!isSupabaseConfigured() || typeof targetUserId !== "string" || !targetUserId) {
    return { ok: false, reason: "error" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };
    if (user.id === targetUserId) return { ok: false, reason: "self" };

    // Block relationship — either direction forbids following.
    const { data: blocks } = await supabase
      .from("blocked_users")
      .select("blocker_id, blocked_id")
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${user.id})`,
      )
      .limit(1);
    if (blocks && blocks.length > 0) return { ok: false, reason: "blocked" };

    // Target must exist.
    const { data: target } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", targetUserId)
      .maybeSingle();
    if (!target) return { ok: false, reason: "unavailable" };

    const { data: existing } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("id", (existing as { id: string }).id);
      if (error) return { ok: false, reason: "error" };
      return { ok: true, active: false };
    }

    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: targetUserId } as never);
    if (error) return { ok: false, reason: "error" };
    return { ok: true, active: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Like / unlike a post. Writes directly to `post_likes` as the signed-in user
 * (RLS enforces `user_id = auth.uid()`); the DB trigger keeps `like_count` in
 * sync. Defense-in-depth: the post must be readable via `posts_viewer_safe`
 * and not be a draft/scheduled/processing/failed item — so hidden, private, or
 * unfinished posts can never be liked from the web.
 */
export async function togglePostLikeAction(postId: string): Promise<EngagementActionResult> {
  if (!isSupabaseConfigured() || typeof postId !== "string" || !postId) {
    return { ok: false, reason: "error" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    // The post must be visible to this viewer and fully live.
    const { data: postRow } = await supabase
      .from("posts_viewer_safe")
      .select("id, scheduled_status, media_processing_status")
      .eq("id", postId)
      .maybeSingle();
    if (!postRow) return { ok: false, reason: "unavailable" };
    const row = postRow as { scheduled_status?: string | null; media_processing_status?: string | null };
    if (String(row.scheduled_status ?? "live").toLowerCase() !== "live") {
      return { ok: false, reason: "unavailable" };
    }
    if (PROCESSING_BLOCK.has(String(row.media_processing_status ?? "").toLowerCase().trim())) {
      return { ok: false, reason: "unavailable" };
    }

    const { data: existing } = await supabase
      .from("post_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("id", (existing as { id: string }).id);
      if (error) return { ok: false, reason: "error" };
      return { ok: true, active: false };
    }

    const { error } = await supabase
      .from("post_likes")
      .insert({ user_id: user.id, post_id: postId, reaction: "heart" } as never);
    if (error) return { ok: false, reason: "error" };
    return { ok: true, active: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Read-only comments for a post, called on demand when the Feed theater's
 * comments panel opens. Delegates to the server-only loader, which enforces
 * post visibility, anonymous masking, deleted-comment exclusion, and
 * blocked-author filtering. No write path.
 */
export async function fetchPostCommentsAction(postId: string): Promise<WebCommentsResult> {
  return loadPostComments(postId);
}

/** Outcome of a guarded comment create. No raw DB errors ever reach the client. */
export type CommentCreateResult =
  | { ok: true }
  | {
      ok: false;
      reason: "auth" | "blocked" | "unavailable" | "empty" | "too_long" | "error" | "not_member";
    };

/**
 * Create a text-only top-level comment on a post as the signed-in user. Mirrors
 * the React Native `commentsService.create` insert (`comments` table:
 * `author_id = auth.uid()`, no media, no parent) and layers the same web read
 * guards used by the comments loader on top:
 *   - the post must be visible via `posts_viewer_safe`, live, not processing,
 *     and public/alias (or owned by the viewer),
 *   - on a non-anonymous post, a block in either direction with the author is
 *     rejected; anonymous posts keep RLS as the source of truth (author masked).
 * RLS is still the ultimate gate on the insert. Nested replies / media / Circle
 * thread replies are intentionally out of scope for this phase.
 */
export async function createPostCommentAction(
  postId: string,
  body: string,
): Promise<CommentCreateResult> {
  if (!isSupabaseConfigured() || typeof postId !== "string" || !postId) {
    return { ok: false, reason: "error" };
  }
  if (typeof body !== "string") return { ok: false, reason: "empty" };
  const content = body.trim();
  if (!content) return { ok: false, reason: "empty" };
  if (content.length > COMMENT_MAX_LENGTH) return { ok: false, reason: "too_long" };

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    // The post must be visible to this viewer and fully live.
    const { data: postRow } = await supabase
      .from("posts_viewer_safe")
      .select("id, is_anonymous, creator_id, scheduled_status, media_processing_status, privacy_mode")
      .eq("id", postId)
      .maybeSingle();
    if (!postRow) return { ok: false, reason: "unavailable" };

    const pr = postRow as {
      is_anonymous?: boolean | null;
      creator_id?: string | null;
      scheduled_status?: string | null;
      media_processing_status?: string | null;
      privacy_mode?: string | null;
    };
    if (String(pr.scheduled_status ?? "live").toLowerCase() !== "live") {
      return { ok: false, reason: "unavailable" };
    }
    if (PROCESSING_BLOCK.has(String(pr.media_processing_status ?? "").toLowerCase().trim())) {
      return { ok: false, reason: "unavailable" };
    }
    const privacy = String(pr.privacy_mode ?? "public").toLowerCase();
    const creatorId = typeof pr.creator_id === "string" ? pr.creator_id : null;
    const ownPost = creatorId != null && creatorId === user.id;
    if (!PUBLIC_PRIVACY.has(privacy) && !ownPost) return { ok: false, reason: "unavailable" };

    const postIsAnonymous = Boolean(pr.is_anonymous) || !creatorId || creatorId === ANON_SENTINEL;

    // Non-anonymous post: a block in either direction with the author forbids
    // commenting. (Anonymous author identity is masked — RLS guards those.)
    if (!postIsAnonymous && creatorId && creatorId !== user.id) {
      const { data: blocks } = await supabase
        .from("blocked_users")
        .select("blocker_id, blocked_id")
        .or(
          `and(blocker_id.eq.${user.id},blocked_id.eq.${creatorId}),and(blocker_id.eq.${creatorId},blocked_id.eq.${user.id})`,
        )
        .limit(1);
      if (blocks && blocks.length > 0) return { ok: false, reason: "blocked" };
    }

    const { error } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: user.id, content, parent_id: null, media_url: null } as never);
    if (error) return { ok: false, reason: "error" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Create a text-only reply on a Circle thread as the signed-in user. Mirrors the
 * React Native `circleThreadsDb.addReply` insert (`circle_replies`:
 * `author_id = auth.uid()`, no media, top-level only) and layers the same
 * read-side access guards used by `loadCircleThread`:
 *   - the thread must be readable via `circle_threads_viewer_safe`, belong to
 *     the circle named by `slug`, be `moderation_status = active`, and not
 *     soft-deleted,
 *   - on a non-confession circle, a block in either direction with the thread
 *     author is rejected; confession circles keep the author masked and rely on
 *     RLS as the source of truth.
 * RLS still gates the insert (circle membership / privacy). Nested replies,
 * media, and new-thread creation are intentionally out of scope.
 */
export async function createCircleReplyAction(
  slug: string,
  threadId: string,
  body: string,
): Promise<CommentCreateResult> {
  if (
    !isSupabaseConfigured() ||
    typeof slug !== "string" ||
    !slug ||
    typeof threadId !== "string" ||
    !threadId
  ) {
    return { ok: false, reason: "error" };
  }
  if (typeof body !== "string") return { ok: false, reason: "empty" };
  const content = body.trim();
  if (!content) return { ok: false, reason: "empty" };
  if (content.length > COMMENT_MAX_LENGTH) return { ok: false, reason: "too_long" };

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    // The circle named by the slug must exist and own this thread.
    const { data: community } = await supabase
      .from("communities")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();
    if (!community) return { ok: false, reason: "unavailable" };
    const communityId = String((community as { id: string }).id);

    // The thread must be readable to this viewer (RLS via the viewer-safe view),
    // belong to this circle, be active, and not soft-deleted.
    const { data: threadRow } = await supabase
      .from("circle_threads_viewer_safe")
      .select("id, community_id, author_id, moderation_status, deleted_at")
      .eq("id", threadId)
      .maybeSingle();
    if (!threadRow) return { ok: false, reason: "unavailable" };
    const tr = threadRow as {
      community_id?: string | null;
      author_id?: string | null;
      moderation_status?: string | null;
      deleted_at?: string | null;
    };
    if (String(tr.community_id) !== communityId) return { ok: false, reason: "unavailable" };
    if (String(tr.moderation_status ?? "active") !== "active" || tr.deleted_at != null) {
      return { ok: false, reason: "unavailable" };
    }

    // Posting RLS requires circle membership. Check it explicitly so a non-member
    // gets a clear "join in app" message instead of a generic insert failure.
    const { data: membership } = await supabase
      .from("community_members")
      .select("user_id")
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return { ok: false, reason: "not_member" };

    const isConfession = isConfessionCircle(slug);
    const threadAuthor = typeof tr.author_id === "string" ? tr.author_id : null;

    // Non-confession circle: a block in either direction with the thread author
    // forbids replying. (Confession authors are masked — RLS guards those.)
    if (!isConfession && threadAuthor && threadAuthor !== user.id && threadAuthor !== ANON_SENTINEL) {
      const { data: blocks } = await supabase
        .from("blocked_users")
        .select("blocker_id, blocked_id")
        .or(
          `and(blocker_id.eq.${user.id},blocked_id.eq.${threadAuthor}),and(blocker_id.eq.${threadAuthor},blocked_id.eq.${user.id})`,
        )
        .limit(1);
      if (blocks && blocks.length > 0) return { ok: false, reason: "blocked" };
    }

    const { error } = await supabase
      .from("circle_replies")
      .insert({ thread_id: threadId, author_id: user.id, body: content } as never);
    if (error) return { ok: false, reason: "error" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}
