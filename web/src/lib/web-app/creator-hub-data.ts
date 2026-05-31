import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

import { isVideoType, toHttps } from "./format";

type AnyRow = Record<string, unknown>;
type Supa = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const RECENT_LIMIT = 12;
const PROCESSING = new Set(["queued", "running"]);

export type CreatorHubStatus = "live" | "processing" | "failed" | "scheduled";

export type CreatorHubPost = {
  id: string;
  type: string;
  caption: string | null;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  isVideo: boolean;
  createdAt: string | null;
  likeCount: number;
  commentCount: number;
  status: CreatorHubStatus;
};

export type CreatorHubOverview = {
  /** Exact totals (count queries). */
  totalPosts: number;
  livePosts: number;
  processing: number;
  failed: number;
  /** Engagement summed across the recent window (labelled "recent" in UI). */
  recentLikes: number;
  recentComments: number;
};

export type WebCreatorHubResult =
  | { state: "error" }
  | { state: "ok"; overview: CreatorHubOverview; recent: CreatorHubPost[] };

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function statusOf(row: AnyRow): CreatorHubStatus {
  const proc = String(row.media_processing_status ?? "").toLowerCase().trim();
  const sched = String(row.scheduled_status ?? "live").toLowerCase().trim();
  if (PROCESSING.has(proc)) return "processing";
  if (proc === "failed" || sched === "failed") return "failed";
  if (sched === "scheduled" || sched === "sending") return "scheduled";
  return "live";
}

/**
 * Owner-only Creator Hub dashboard data. Always scoped to the signed-in creator
 * (`userId === viewer`), so processing/failed posts are visible to the owner but
 * never leak publicly. RLS on `posts_viewer_safe` is the source of truth; this
 * loader only ever queries the owner's own `creator_id`.
 */
export async function loadCreatorHub(userId: string): Promise<WebCreatorHubResult> {
  if (!isSupabaseConfigured() || !userId) return { state: "error" };
  let supabase: Supa;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }

  // We only need counts here; head:true avoids transferring rows.
  const countAll = supabase
    .from("posts_viewer_safe")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", userId);
  const countProcessing = supabase
    .from("posts_viewer_safe")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", userId)
    .in("media_processing_status", ["queued", "running"]);
  const countFailed = supabase
    .from("posts_viewer_safe")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", userId)
    .eq("media_processing_status", "failed");

  try {
    const [totalRes, procRes, failRes, recentRes] = await Promise.all([
      countAll,
      countProcessing,
      countFailed,
      supabase
        .from("posts_viewer_safe")
        .select(
          "id, type, caption, thumbnail_url, media_url, created_at, like_count, comment_count, scheduled_status, media_processing_status",
        )
        .eq("creator_id", userId)
        .order("created_at", { ascending: false })
        .limit(RECENT_LIMIT),
    ]);

    const totalPosts = totalRes.count ?? 0;
    const processing = procRes.count ?? 0;
    const failed = failRes.count ?? 0;

    const rows = (recentRes.data ?? []) as AnyRow[];
    const recent: CreatorHubPost[] = rows.map((r) => ({
      id: String(r.id),
      type: String(r.type ?? "post"),
      caption: str(r.caption),
      thumbnailUrl: toHttps(r.thumbnail_url),
      mediaUrl: toHttps(r.media_url),
      isVideo: isVideoType(r.type),
      createdAt: str(r.created_at),
      likeCount: num(r.like_count),
      commentCount: num(r.comment_count),
      status: statusOf(r),
    }));

    const recentLikes = recent.reduce((acc, p) => acc + p.likeCount, 0);
    const recentComments = recent.reduce((acc, p) => acc + p.commentCount, 0);
    const livePosts = Math.max(0, totalPosts - processing - failed);

    return {
      state: "ok",
      overview: { totalPosts, livePosts, processing, failed, recentLikes, recentComments },
      recent,
    };
  } catch {
    return { state: "error" };
  }
}
