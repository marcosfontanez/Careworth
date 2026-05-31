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
