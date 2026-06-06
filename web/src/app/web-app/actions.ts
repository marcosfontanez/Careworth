"use server";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  resolveThreadCreateFlair,
  resolveThreadFlairUpdate,
  flairLabelForThread,
  type CircleFlairTag,
  type CircleThreadKind,
} from "@/lib/circles/flairs";
import type { CircleActivityBadgeRow } from "@/lib/circles/activity-badges";
import { ANON_SENTINEL, isConfessionCircle, fetchCircleActivityBadges } from "@/lib/web-app/circles-data";
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
/** Circle thread title/body caps — mirrors native `circleThreadsDb.createThread`. */
const THREAD_TITLE_MAX = 500;
const THREAD_BODY_MAX = 12000;
const VALID_FLAIR_TAGS = new Set<string>([
  "question",
  "story",
  "humor",
  "career_advice",
  "caregiver_support",
  "student_help",
  "education",
  "rant_vent",
  "mythbuster",
  "live_qa",
]);

function looksLikeRlsPolicyDenial(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  const code = String((err as { code?: string }).code ?? "");
  const msg = String((err as { message?: string }).message ?? "").toLowerCase();
  return code === "42501" || msg.includes("row-level security") || msg.includes("violates row-level security");
}
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
 * Pulse / unlike a My Pulse update. Delegates to `toggle_profile_update_like`
 * so insert/delete and count sync stay atomic on the server.
 */
export async function toggleProfileUpdateLikeAction(
  updateId: string,
): Promise<EngagementActionResult> {
  if (!isSupabaseConfigured() || typeof updateId !== "string" || !updateId) {
    return { ok: false, reason: "error" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data, error } = await supabase.rpc("toggle_profile_update_like", {
      p_update_id: updateId,
    });
    if (error) return { ok: false, reason: "error" };
    return { ok: true, active: Boolean(data) };
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

/** Outcome of a Circle join / leave toggle. */
export type CircleMembershipResult =
  | { ok: true; joined: boolean }
  | { ok: false; reason: "auth" | "unavailable" | "error" };

/**
 * Join or leave a Circle as the signed-in user. Mirrors the React Native
 * `communitiesService.toggleJoin`: a plain insert/delete on `community_members`
 * (RLS policy "Users can manage own memberships" enforces `user_id = auth.uid()`,
 * so a user can only ever toggle their own membership). Joining sets
 * `notify_new_posts = true` to match the app default. Membership is what the
 * Circles posting RLS (`is_member_of_community`) checks, so a successful join
 * immediately unlocks thread replies on the next server render.
 */
export async function toggleCircleMembershipAction(slug: string): Promise<CircleMembershipResult> {
  if (!isSupabaseConfigured() || typeof slug !== "string" || !slug) {
    return { ok: false, reason: "error" };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    // The Circle must exist and be readable to this viewer (RLS on communities).
    const { data: community } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!community) return { ok: false, reason: "unavailable" };
    const communityId = String((community as { id: string }).id);

    const { data: existing } = await supabase
      .from("community_members")
      .select("id")
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("community_members")
        .delete()
        .eq("id", (existing as { id: string }).id);
      if (error) return { ok: false, reason: "error" };
      return { ok: true, joined: false };
    }

    const { error } = await supabase
      .from("community_members")
      .insert({ community_id: communityId, user_id: user.id, notify_new_posts: true } as never);
    if (error) return { ok: false, reason: "error" };
    return { ok: true, joined: true };
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

/** Outcome of toggling Helpful on a Circle reply. */
export type CircleReplyHelpfulResult =
  | { ok: true; reacted: boolean; helpfulCount: number }
  | { ok: false; reason: "auth" | "blocked" | "unavailable" | "error" };

/**
 * Toggle Helpful on a Circle reply — mirrors native `circleThreadsDb.toggleReplyHelpful`.
 * RLS + `user_can_react_to_circle_reply` enforce membership and block guards.
 */
export async function toggleCircleReplyHelpfulAction(
  replyId: string,
): Promise<CircleReplyHelpfulResult> {
  if (!isSupabaseConfigured() || typeof replyId !== "string" || !replyId) {
    return { ok: false, reason: "error" };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data: replyRow, error: replyErr } = await supabase
      .from("circle_replies_viewer_safe")
      .select("id, author_id, moderation_status, helpful_count")
      .eq("id", replyId)
      .maybeSingle();
    if (replyErr || !replyRow) return { ok: false, reason: "unavailable" };
    const rr = replyRow as {
      author_id?: string | null;
      moderation_status?: string | null;
      helpful_count?: number | null;
    };
    if (String(rr.moderation_status ?? "active") !== "active") {
      return { ok: false, reason: "unavailable" };
    }

    const authorId = typeof rr.author_id === "string" ? rr.author_id : null;
    if (authorId && authorId !== user.id && authorId !== ANON_SENTINEL) {
      const { data: blocks } = await supabase
        .from("blocked_users")
        .select("blocker_id, blocked_id")
        .or(
          `and(blocker_id.eq.${user.id},blocked_id.eq.${authorId}),and(blocker_id.eq.${authorId},blocked_id.eq.${user.id})`,
        )
        .limit(1);
      if (blocks && blocks.length > 0) return { ok: false, reason: "blocked" };
    }

    const { data: existing, error: readErr } = await supabase
      .from("circle_reply_reactions")
      .select("id")
      .eq("reply_id", replyId)
      .eq("user_id", user.id)
      .eq("reaction_type", "helpful")
      .maybeSingle();
    if (readErr) return { ok: false, reason: "error" };

    if (existing?.id) {
      const { error } = await supabase
        .from("circle_reply_reactions")
        .delete()
        .eq("id", String((existing as { id: string }).id));
      if (error) return { ok: false, reason: "error" };
      const { data: row } = await supabase
        .from("circle_replies_viewer_safe")
        .select("helpful_count")
        .eq("id", replyId)
        .maybeSingle();
      return {
        ok: true,
        reacted: false,
        helpfulCount: Number((row as { helpful_count?: number } | null)?.helpful_count ?? rr.helpful_count ?? 0),
      };
    }

    const { error: insertErr } = await supabase.from("circle_reply_reactions").insert({
      reply_id: replyId,
      user_id: user.id,
      reaction_type: "helpful",
    } as never);
    if (insertErr) {
      if ((insertErr as { code?: string }).code === "23505") {
        return { ok: true, reacted: true, helpfulCount: Number(rr.helpful_count ?? 0) };
      }
      return { ok: false, reason: "error" };
    }

    const { data: row } = await supabase
      .from("circle_replies_viewer_safe")
      .select("helpful_count")
      .eq("id", replyId)
      .maybeSingle();
    return {
      ok: true,
      reacted: true,
      helpfulCount: Number((row as { helpful_count?: number } | null)?.helpful_count ?? 0),
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Outcome of creating a text-only Circle discussion thread. */
export type CircleThreadCreateResult =
  | { ok: true; threadId: string }
  | {
      ok: false;
      reason: "auth" | "empty" | "too_long" | "not_member" | "unavailable" | "error";
    };

/**
 * Create a text-only Circle thread — mirrors native `circleThreadsDb.createThread`.
 * RLS requires membership (`is_member_of_community`) and `author_id = auth.uid()`.
 */
export async function createCircleThreadAction(
  slug: string,
  input: {
    title: string;
    body: string;
    flairTag?: CircleFlairTag | null;
    postType?: "thread" | "question";
  },
): Promise<CircleThreadCreateResult> {
  if (!isSupabaseConfigured() || typeof slug !== "string" || !slug) {
    return { ok: false, reason: "error" };
  }

  const titleRaw = typeof input?.title === "string" ? input.title.trim() : "";
  const bodyRaw = typeof input?.body === "string" ? input.body.trim() : "";
  if (!titleRaw) return { ok: false, reason: "empty" };
  if (!bodyRaw) return { ok: false, reason: "empty" };
  if (titleRaw.length > THREAD_TITLE_MAX || bodyRaw.length > THREAD_BODY_MAX) {
    return { ok: false, reason: "too_long" };
  }

  const flairRaw = input.flairTag?.trim() || null;
  const flairTag =
    flairRaw && VALID_FLAIR_TAGS.has(flairRaw) ? (flairRaw as CircleFlairTag) : null;
  const postType = input.postType === "question" ? "question" : "thread";
  const { kind, flairTag: resolvedFlair } = resolveThreadCreateFlair({ postType, flairTag });

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data: community } = await supabase
      .from("communities")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();
    if (!community) return { ok: false, reason: "unavailable" };
    const communityId = String((community as { id: string }).id);

    const { data: membership } = await supabase
      .from("community_members")
      .select("user_id")
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return { ok: false, reason: "not_member" };

    const title = titleRaw.slice(0, THREAD_TITLE_MAX);
    const body = bodyRaw.slice(0, THREAD_BODY_MAX);

    const { data: inserted, error } = await supabase
      .from("circle_threads")
      .insert({
        community_id: communityId,
        author_id: user.id,
        kind,
        flair_tag: resolvedFlair ?? null,
        title,
        body,
        media_thumb_url: null,
        linked_post_id: null,
      } as never)
      .select("id")
      .single();

    if (error || !inserted) {
      if (looksLikeRlsPolicyDenial(error)) return { ok: false, reason: "not_member" };
      return { ok: false, reason: "error" };
    }

    return { ok: true, threadId: String((inserted as { id: string }).id) };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export type CircleActivityBadgesResult =
  | { ok: true; badges: CircleActivityBadgeRow[] }
  | { ok: false; reason: "auth" | "error" };

/** Load joined-circle activity badges with client-supplied last-visit timestamps. */
export async function loadCircleActivityBadgesAction(
  communityIds: string[],
  sinceByCommunity: Record<string, string>,
): Promise<CircleActivityBadgesResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "error" };
  const ids = communityIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) return { ok: true, badges: [] };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const since: Record<string, string> = {};
    for (const id of ids) {
      const ts = sinceByCommunity[id]?.trim();
      if (ts) since[id] = ts;
    }

    const map = await fetchCircleActivityBadges(ids, since);
    return { ok: true, badges: [...map.values()] };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export type CircleThreadFlairUpdateResult =
  | { ok: true; flairTag: CircleFlairTag | null; kind: CircleThreadKind; flairLabel: string }
  | { ok: false; reason: "auth" | "forbidden" | "unavailable" | "error" };

/** Update thread flair — author or circle moderator/staff (RLS enforced). */
export async function updateCircleThreadFlairAction(
  slug: string,
  threadId: string,
  flairTag: CircleFlairTag | null,
): Promise<CircleThreadFlairUpdateResult> {
  if (!isSupabaseConfigured() || !slug || !threadId) return { ok: false, reason: "error" };

  const flairRaw = flairTag?.trim() || null;
  const nextFlair =
    flairRaw && VALID_FLAIR_TAGS.has(flairRaw) ? (flairRaw as CircleFlairTag) : null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const { data: community } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!community) return { ok: false, reason: "unavailable" };
    const communityId = String((community as { id: string }).id);

    const { data: threadRow } = await supabase
      .from("circle_threads")
      .select("id, kind, author_id, moderation_status, deleted_at, community_id")
      .eq("id", threadId)
      .maybeSingle();
    if (!threadRow) return { ok: false, reason: "unavailable" };
    const tr = threadRow as {
      kind?: string;
      author_id?: string;
      moderation_status?: string;
      deleted_at?: string | null;
      community_id?: string;
    };
    if (String(tr.community_id) !== communityId) return { ok: false, reason: "unavailable" };
    if (String(tr.moderation_status ?? "active") !== "active" || tr.deleted_at != null) {
      return { ok: false, reason: "unavailable" };
    }

    const isAuthor = String(tr.author_id) === user.id;
    if (!isAuthor) {
      const { data: canMod } = await supabase.rpc("can_moderate_circle_for_user", {
        p_community_id: communityId,
        p_user_id: user.id,
      });
      if (!canMod) return { ok: false, reason: "forbidden" };
    }

    const currentKind = (
      ["question", "story", "advice", "meme", "media"].includes(String(tr.kind))
        ? tr.kind
        : "story"
    ) as CircleThreadKind;
    const { flairTag: savedTag, kind: nextKind } = resolveThreadFlairUpdate(nextFlair, currentKind);

    const { error } = await supabase
      .from("circle_threads")
      .update({
        flair_tag: savedTag,
        kind: nextKind,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", threadId);
    if (error) {
      if (looksLikeRlsPolicyDenial(error)) return { ok: false, reason: "forbidden" };
      return { ok: false, reason: "error" };
    }

    return {
      ok: true,
      flairTag: savedTag,
      kind: nextKind,
      flairLabel: flairLabelForThread({ kind: nextKind, flairTag: savedTag }),
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Outcome of web onboarding mutations. */
export type WebOnboardingActionResult = { ok: true } | { ok: false; reason: "auth" | "error" };

export type WebOnboardingCircleOption = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  memberCount: number;
};

export type WebOnboardingCompleteInput = {
  audienceRole: string | null;
  interests: string[];
  circleIds: string[];
  displayName: string;
  username?: string | null;
  bio?: string;
  city?: string;
  state?: string;
  role?: string;
  specialty?: string;
  yearsExperience?: number;
  medicalSafetyAcknowledged?: boolean;
};

/** Suggested starter Circles for the onboarding wizard (server-side slug ranking). */
export async function loadWebOnboardingCirclesAction(input: {
  audienceRole: string | null;
  interests: string[];
}): Promise<WebOnboardingCircleOption[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { suggestWebOnboardingCircleSlugs } = await import("@/lib/web-app/onboarding-circle-suggestions");
    const slugs = suggestWebOnboardingCircleSlugs({
      audienceRole: input.audienceRole as import("@/lib/web-app/onboarding-constants").WebAudienceRole | null,
      interests: input.interests as import("@/lib/web-app/onboarding-constants").WebContentInterest[],
      limit: 8,
    });
    if (slugs.length === 0) return [];
    const supabase = await createSupabaseServerClient();
    const { data: rows } = await supabase
      .from("communities")
      .select("id, slug, name, description, icon, member_count")
      .in("slug", slugs);
    if (!rows?.length) return [];
    const order = new Map(slugs.map((s, i) => [s, i]));
    return [...rows]
      .sort((a, b) => (order.get(String(a.slug)) ?? 99) - (order.get(String(b.slug)) ?? 99))
      .map((r) => ({
        id: String(r.id),
        slug: String(r.slug),
        name: String(r.name),
        description: r.description != null ? String(r.description) : null,
        icon: r.icon != null ? String(r.icon) : null,
        memberCount: Number(r.member_count ?? 0),
      }));
  } catch {
    return [];
  }
}

async function joinWebOnboardingCircles(userId: string, communityIds: string[]): Promise<void> {
  const uniq = [...new Set(communityIds.filter(Boolean))];
  if (uniq.length === 0) return;
  const supabase = await createSupabaseServerClient();
  for (const communityId of uniq) {
    const { data: existing } = await supabase
      .from("community_members")
      .select("id")
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) continue;
    await supabase
      .from("community_members")
      .insert({ community_id: communityId, user_id: userId, notify_new_posts: true } as never);
  }
}

/** Persist onboarding choices and mark the profile complete (web mirror of native flow). */
export async function completeWebOnboardingAction(
  input: WebOnboardingCompleteInput,
): Promise<WebOnboardingActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "error" };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };

    const interests = [...new Set((input.interests ?? []).filter(Boolean))];
    await supabase.from("user_interests").delete().eq("user_id", user.id);
    if (interests.length > 0) {
      const { error: insErr } = await supabase.from("user_interests").insert(
        interests.map((interest) => ({ user_id: user.id, interest })) as never,
      );
      if (insErr) return { ok: false, reason: "error" };
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      audience_role: input.audienceRole,
      onboarding_completed_at: now,
      updated_at: now,
    };
    if (input.displayName?.trim()) patch.display_name = input.displayName.trim();
    if (input.username !== undefined) patch.username = input.username;
    if (input.bio !== undefined) patch.bio = input.bio;
    if (input.city !== undefined) patch.city = input.city;
    if (input.state !== undefined) patch.state = input.state;
    if (input.role !== undefined) patch.role = input.role;
    if (input.specialty !== undefined) patch.specialty = input.specialty;
    if (input.yearsExperience !== undefined) patch.years_experience = input.yearsExperience;
    if (input.medicalSafetyAcknowledged) patch.medical_safety_acknowledged_at = now;

    const { error: profileErr } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (profileErr) return { ok: false, reason: "error" };

    await joinWebOnboardingCircles(user.id, input.circleIds ?? []);
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Skip onboarding — marks complete without persisting preferences. */
export async function skipWebOnboardingAction(): Promise<WebOnboardingActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "error" };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" };
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: now, updated_at: now })
      .eq("id", user.id);
    if (error) return { ok: false, reason: "error" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}
