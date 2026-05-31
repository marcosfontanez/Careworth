"use server";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Result of a guarded engagement mutation. `active` is the new state
 * (following / liked). On failure, `reason` tells the client how to recover
 * without exposing raw errors.
 */
export type EngagementActionResult =
  | { ok: true; active: boolean }
  | { ok: false; reason: "auth" | "self" | "blocked" | "unavailable" | "error" };

const PROCESSING_BLOCK = new Set(["queued", "running", "failed"]);

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
