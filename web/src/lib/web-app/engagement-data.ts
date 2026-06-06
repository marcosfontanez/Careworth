import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Set of post ids (from `postIds`) the viewer has liked. Best-effort. */
export async function loadLikedPostIds(
  supabase: Supa,
  viewerId: string,
  postIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(postIds.filter(Boolean))];
  if (ids.length === 0) return new Set();
  try {
    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", viewerId)
      .in("post_id", ids);
    return new Set(((data ?? []) as { post_id: string }[]).map((r) => String(r.post_id)));
  } catch {
    return new Set();
  }
}

/** Set of update ids (from `updateIds`) the viewer has Pulsed. Best-effort. */
export async function loadLikedProfileUpdateIds(
  supabase: Supa,
  viewerId: string,
  updateIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(updateIds.filter(Boolean))];
  if (ids.length === 0) return new Set();
  try {
    const { data } = await supabase
      .from("profile_update_likes")
      .select("update_id")
      .eq("user_id", viewerId)
      .in("update_id", ids);
    return new Set(((data ?? []) as { update_id: string }[]).map((r) => String(r.update_id)));
  } catch {
    return new Set();
  }
}

/**
 * Set of user ids that are blocked relative to the viewer, in *both* directions
 * (the viewer blocked them, or they blocked the viewer). One batched query.
 * Best-effort: returns an empty set on any failure so callers can fall back.
 */
export async function loadBlockedUserIds(supabase: Supa, viewerId: string): Promise<Set<string>> {
  if (!viewerId) return new Set();
  try {
    const { data } = await supabase
      .from("blocked_users")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`);
    const out = new Set<string>();
    for (const r of (data ?? []) as { blocker_id: string; blocked_id: string }[]) {
      const blocker = String(r.blocker_id);
      const blocked = String(r.blocked_id);
      if (blocker === viewerId) out.add(blocked);
      if (blocked === viewerId) out.add(blocker);
    }
    return out;
  } catch {
    return new Set();
  }
}

/** Set of target ids (from `targetIds`) the viewer already follows. Best-effort. */
export async function loadFollowingIds(
  supabase: Supa,
  viewerId: string,
  targetIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(targetIds.filter(Boolean))];
  if (ids.length === 0) return new Set();
  try {
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewerId)
      .in("following_id", ids);
    return new Set(((data ?? []) as { following_id: string }[]).map((r) => String(r.following_id)));
  } catch {
    return new Set();
  }
}
