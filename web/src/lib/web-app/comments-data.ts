import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

import {
  ANON_SENTINEL,
  anonymousDisplayName,
  hydrateAuthors,
  loadHiddenCreators,
} from "./circles-data";
import { toHttps } from "./format";

type AnyRow = Record<string, unknown>;

/** Posts still rendering / failed must never expose their comments. */
const PROCESSING_BLOCK = new Set(["queued", "running", "failed"]);
/** Only public / aliased posts are readable to other viewers. */
const PUBLIC_PRIVACY = new Set(["public", "alias"]);
/** Cap top-level comments rendered in the read-only web panel. */
const COMMENT_LIMIT = 100;
/** Cap rows pulled before reply-count aggregation. */
const FETCH_LIMIT = 500;

export type WebCommentAuthor = {
  /** `null` for anonymous / masked authors — never linkable. */
  id: string | null;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};

export type WebComment = {
  id: string;
  body: string;
  hasMedia: boolean;
  createdAt: string | null;
  edited: boolean;
  likeCount: number;
  replyCount: number;
  isAnonymous: boolean;
  author: WebCommentAuthor | null;
};

export type WebCommentsResult =
  | { state: "unavailable" }
  | { state: "error" }
  | { state: "ok"; comments: WebComment[]; total: number };

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

/**
 * Read-only comments for a single post, for the native web Feed theater.
 *
 * Privacy is enforced by the database first: `comments_viewer_safe` excludes
 * soft-deleted rows, filters out comments on posts the viewer can't read
 * (`viewer_can_read_post_row`), and masks the author_id to a sentinel when the
 * parent post is anonymous. We add belt-and-suspenders on top:
 *   - the post itself must be visible + live + not processing + public/alias
 *     (or owned by the viewer),
 *   - anonymous posts render per-comment pseudonyms with no profile link,
 *   - on non-anonymous posts, blocked/hidden authors are dropped.
 * Never bypasses RLS; never exposes anonymous identity.
 */
export async function loadPostComments(postId: string): Promise<WebCommentsResult> {
  if (!isSupabaseConfigured() || typeof postId !== "string" || !postId) {
    return { state: "error" };
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { state: "unavailable" };

    // 1) The post must be visible to this viewer and fully live.
    const { data: postRow } = await supabase
      .from("posts_viewer_safe")
      .select("id, is_anonymous, creator_id, scheduled_status, media_processing_status, privacy_mode")
      .eq("id", postId)
      .maybeSingle();
    if (!postRow) return { state: "unavailable" };

    const pr = postRow as AnyRow;
    if (String(pr.scheduled_status ?? "live").toLowerCase() !== "live") return { state: "unavailable" };
    if (PROCESSING_BLOCK.has(String(pr.media_processing_status ?? "").toLowerCase().trim())) {
      return { state: "unavailable" };
    }
    const privacy = String(pr.privacy_mode ?? "public").toLowerCase();
    const creatorId = typeof pr.creator_id === "string" ? pr.creator_id : null;
    const ownPost = creatorId != null && creatorId === user.id;
    if (!PUBLIC_PRIVACY.has(privacy) && !ownPost) return { state: "unavailable" };

    const postIsAnonymous = Boolean(pr.is_anonymous) || !creatorId || creatorId === ANON_SENTINEL;

    // 2) Comments via the viewer-safe view (deleted excluded; private posts
    //    filtered server-side; anonymous author_id masked to the sentinel).
    const { data: rows, error } = await supabase
      .from("comments_viewer_safe")
      .select("id, parent_id, author_id, content, created_at, edited_at, like_count, media_url")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(FETCH_LIMIT);
    if (error) return { state: "error" };

    const all = (rows ?? []) as AnyRow[];

    // Reply counts per parent (across the full fetched set).
    const replyCounts = new Map<string, number>();
    for (const r of all) {
      const parent = typeof r.parent_id === "string" ? r.parent_id : null;
      if (parent) replyCounts.set(parent, (replyCounts.get(parent) ?? 0) + 1);
    }

    const hidden = await loadHiddenCreators(supabase, user.id);

    // Top-level comments only (replies are summarized as a count).
    const top = all.filter((r) => !r.parent_id);

    // On non-anonymous posts identities are visible, so exclude blocked authors.
    const visible = top.filter((r) => {
      if (postIsAnonymous) return true;
      const a = typeof r.author_id === "string" ? r.author_id : null;
      return !(a && hidden.has(a));
    });

    const profiles = postIsAnonymous
      ? new Map<string, AnyRow>()
      : await hydrateAuthors(
          supabase,
          visible.map((r) => (typeof r.author_id === "string" ? r.author_id : "")).filter(Boolean),
        );

    const comments: WebComment[] = visible.slice(0, COMMENT_LIMIT).map((r) => {
      const id = String(r.id);
      const rawAuthor = typeof r.author_id === "string" ? r.author_id : null;
      const content = typeof r.content === "string" ? r.content : "";
      const hasMedia = Boolean(str(r.media_url));

      let author: WebCommentAuthor;
      if (postIsAnonymous) {
        author = {
          id: null,
          displayName: anonymousDisplayName(rawAuthor ?? ANON_SENTINEL, id),
          username: null,
          avatarUrl: null,
        };
      } else if (!rawAuthor || rawAuthor === ANON_SENTINEL) {
        author = { id: null, displayName: "Anonymous", username: null, avatarUrl: null };
      } else {
        const prof = profiles.get(rawAuthor);
        author = {
          id: rawAuthor,
          displayName: str(prof?.display_name) || str(prof?.username) || "PulseVerse member",
          username: str(prof?.username),
          avatarUrl: toHttps(prof?.avatar_url),
        };
      }

      return {
        id,
        body: content,
        hasMedia,
        createdAt: typeof r.created_at === "string" ? r.created_at : null,
        edited: Boolean(r.edited_at),
        likeCount: Number(r.like_count ?? 0) || 0,
        replyCount: replyCounts.get(id) ?? 0,
        isAnonymous: postIsAnonymous,
        author,
      };
    });

    return { state: "ok", comments, total: comments.length };
  } catch {
    return { state: "error" };
  }
}
