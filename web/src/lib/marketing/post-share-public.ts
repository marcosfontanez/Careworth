import { cache } from "react";

import { createPublicSupabaseAnonClient } from "@/lib/supabase/public-anon";

/** Standard UUID string form (Postgres `uuid`). Intentionally permissive — avoid rejecting valid IDs. */
export const POST_SHARE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clampText(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function absoluteOrHttps(url: string, siteBase: string): string {
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${siteBase.replace(/\/$/, "")}/${u.replace(/^\//, "")}`;
}

/**
 * Absolute image URL for link previews (thumbnail, or image media). Videos should
 * rely on `thumbnail_url` for a real frame — crawlers don’t treat MP4 as og:image.
 */
export function postShareVisualPreviewUrl(post: PostSharePublic, siteBase: string): string | null {
  if (post.is_anonymous) return null;
  const type = post.postType.toLowerCase();
  const thumb = (post.thumbnail_url ?? "").trim();
  const media = (post.media_url ?? "").trim();
  if (thumb) return absoluteOrHttps(thumb, siteBase);
  if (type === "image" && media) return absoluteOrHttps(media, siteBase);
  return null;
}

export type PostSharePublic = {
  caption: string;
  thumbnail_url: string | null;
  media_url: string | null;
  postType: string;
  is_anonymous: boolean;
  like_count: number;
  comment_count: number;
  /** e.g. `PulseVerse · @nursejane` — null when anonymous */
  creatorLine: string | null;
};

export function buildPostShareOg(post: PostSharePublic, siteBase: string): {
  title: string;
  description: string;
  imageUrl: string;
} {
  const base = siteBase.replace(/\/$/, "");
  const likes = Math.max(0, Math.floor(Number(post.like_count) || 0));
  const comments = Math.max(0, Math.floor(Number(post.comment_count) || 0));
  const likeStr = likes.toLocaleString("en-US");
  const commentStr = comments.toLocaleString("en-US");
  const cap = post.caption.trim();

  let title: string;
  let description: string;

  if (post.is_anonymous) {
    title = "Anonymous clip";
    description = `${likeStr} likes, ${commentStr} comments.\nOpen PulseVerse to watch this clip.`;
  } else {
    title = cap ? clampText(cap, 60) : "Clip";
    const quote = cap ? `\n"${clampText(cap, 200)}"` : "";
    const byline = post.creatorLine ? `\n${post.creatorLine}` : "\nPulseVerse";
    description = `${likeStr} likes, ${commentStr} comments.${quote}${byline}`;
  }

  const visual = postShareVisualPreviewUrl(post, siteBase);
  const imageUrl = visual ?? `${base}/opengraph-image`;

  return { title, description, imageUrl };
}

/**
 * Public, no-auth snapshot for share landing + Open Graph. Cached per request so
 * `generateMetadata` and the page share one round-trip.
 *
 * Backed by the SECURITY DEFINER RPC `public.get_post_share_public(uuid)` (see
 * migration 235). We previously read `posts_viewer_safe` directly, but migration
 * 220's REVOKE SELECT ... FROM anon on `public.posts` made the view unreachable
 * to the anonymous client we run on the marketing site (caller-side privilege
 * check on the underlying table). The RPC bypasses that and only returns rows
 * that are PUBLIC (or alias) and scheduled live; anonymous posts get null
 * creator fields so we never leak the real author.
 */
export const loadPostSharePublic = cache(async (id: string): Promise<PostSharePublic | null> => {
  if (!POST_SHARE_UUID_RE.test(id)) return null;
  const supabase = createPublicSupabaseAnonClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .rpc("get_post_share_public", { p_id: id })
    .maybeSingle();

  if (error) {
    console.warn("[post-share] get_post_share_public rpc error", {
      id,
      code: (error as { code?: string }).code,
      message: (error as { message?: string }).message,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    return null;
  }
  if (!data) return null;

  const row = data as {
    caption?: string | null;
    thumbnail_url?: string | null;
    media_url?: string | null;
    type?: string | null;
    is_anonymous?: boolean;
    like_count?: number | null;
    comment_count?: number | null;
    creator_display_name?: string | null;
    creator_username?: string | null;
  };

  const isAnonymous = Boolean(row.is_anonymous);
  let creatorLine: string | null = null;
  if (!isAnonymous) {
    const u = (row.creator_username ?? "").trim().replace(/^@/, "");
    const d = (row.creator_display_name ?? "").trim();
    if (u) creatorLine = `PulseVerse · @${u}`;
    else if (d) creatorLine = `PulseVerse · ${d}`;
    else creatorLine = "PulseVerse";
  }

  return {
    caption: String(row.caption ?? ""),
    thumbnail_url: row.thumbnail_url != null ? String(row.thumbnail_url) : null,
    media_url: row.media_url != null ? String(row.media_url) : null,
    postType: String(row.type ?? "text"),
    is_anonymous: isAnonymous,
    like_count: Number(row.like_count ?? 0),
    comment_count: Number(row.comment_count ?? 0),
    creatorLine,
  };
});
