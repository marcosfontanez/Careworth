import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

import { toHttps } from "./format";
import { loadLikedProfileUpdateIds } from "./engagement-data";

type AnyRow = Record<string, unknown>;

export type WebPulseUpdateDetail = {
  id: string;
  userId: string;
  type: string;
  content: string | null;
  previewText: string | null;
  mood: string | null;
  picsUrls: string[];
  mediaThumb: string | null;
  linkedUrl: string | null;
  linkedPostId: string | null;
  createdAt: string | null;
  editedAt: string | null;
  likeCount: number;
  commentCount: number;
  likedByViewer?: boolean;
  author: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
};

export type WebPulseUpdateComment = {
  id: string;
  body: string;
  createdAt: string | null;
  edited: boolean;
  author: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
};

export type WebPulseUpdateResult =
  | { state: "unavailable" }
  | { state: "error" }
  | {
      state: "ok";
      update: WebPulseUpdateDetail;
      comments: WebPulseUpdateComment[];
    };

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function resolvePicsUrls(row: AnyRow): string[] {
  const out: string[] = [];
  if (Array.isArray(row.pics_urls)) {
    for (const u of row.pics_urls) {
      if (typeof u === "string" && u.trim()) out.push(u.trim());
    }
  }
  if (out.length === 0) {
    const thumb = toHttps(row.media_thumb);
    if (thumb) out.push(thumb);
  }
  return out;
}

/** Viewer-scoped My Pulse update + comments for the web detail route. */
export async function loadWebPulseUpdate(
  updateId: string,
  viewerId: string,
): Promise<WebPulseUpdateResult> {
  if (!isSupabaseConfigured() || !updateId) return { state: "error" };

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { state: "error" };
  }

  try {
    const { data: row, error } = await supabase
      .from("profile_updates")
      .select(
        "id, user_id, type, content, preview_text, mood, pics_urls, media_thumb, linked_url, linked_post_id, created_at, edited_at, like_count, comment_count, profiles(id, display_name, username, avatar_url)",
      )
      .eq("id", updateId)
      .maybeSingle();

    if (error || !row) return { state: "unavailable" };

    const r = row as AnyRow;
    const profile = r.profiles as AnyRow | null;
    const authorId = str(r.user_id);
    if (!authorId) return { state: "unavailable" };

    const likedSet =
      viewerId && viewerId.length > 0
        ? await loadLikedProfileUpdateIds(supabase, viewerId, [updateId])
        : new Set<string>();

    const update: WebPulseUpdateDetail = {
      id: String(r.id),
      userId: authorId,
      type: String(r.type ?? "thought"),
      content: str(r.content),
      previewText: str(r.preview_text),
      mood: str(r.mood),
      picsUrls: resolvePicsUrls(r),
      mediaThumb: toHttps(r.media_thumb),
      linkedUrl: str(r.linked_url),
      linkedPostId: str(r.linked_post_id),
      createdAt: str(r.created_at),
      editedAt: str(r.edited_at),
      likeCount: num(r.like_count),
      commentCount: num(r.comment_count),
      likedByViewer: likedSet.has(updateId),
      author: profile
        ? {
            id: authorId,
            displayName: str(profile.display_name) ?? "PulseVerse member",
            username: str(profile.username),
            avatarUrl: toHttps(profile.avatar_url),
          }
        : null,
    };

    const { data: commentRows, error: commentErr } = await supabase
      .from("profile_update_comments")
      .select(
        "id, content, created_at, edited_at, author_id, profiles(id, display_name, username, avatar_url)",
      )
      .eq("update_id", updateId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (commentErr) return { state: "error" };

    const comments: WebPulseUpdateComment[] = ((commentRows ?? []) as AnyRow[]).map((c) => {
      const cp = c.profiles as AnyRow | null;
      const commentAuthorId = str(c.author_id);
      return {
        id: String(c.id),
        body: str(c.content) ?? "",
        createdAt: str(c.created_at),
        edited: Boolean(c.edited_at),
        author:
          cp && commentAuthorId
            ? {
                id: commentAuthorId,
                displayName: str(cp.display_name) ?? "Member",
                username: str(cp.username),
                avatarUrl: toHttps(cp.avatar_url),
              }
            : null,
      };
    });

    void viewerId;
    return { state: "ok", update, comments };
  } catch {
    return { state: "error" };
  }
}

export function isWebPulsePicsUpdate(update: {
  type: string;
  linkedUrl?: string | null;
  picsUrls?: string[];
  mediaThumb?: string | null;
}): boolean {
  const type = update.type.toLowerCase();
  if (type === "pics") return true;
  if (type === "media_note" && !update.linkedUrl?.trim()) {
    return (update.picsUrls?.length ?? 0) > 0 || Boolean(update.mediaThumb?.trim());
  }
  return false;
}

export function resolveWebPicsUrls(update: {
  picsUrls?: string[];
  mediaThumb?: string | null;
}): string[] {
  if (update.picsUrls?.length) return update.picsUrls;
  const thumb = update.mediaThumb?.trim();
  return thumb ? [thumb] : [];
}
