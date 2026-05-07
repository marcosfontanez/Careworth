import { cache } from "react";

import { createPublicSupabaseAnonClient } from "@/lib/supabase/public-anon";

/** Standard UUID string form (Postgres `uuid`). Intentionally permissive — avoid rejecting valid IDs. */
export const POST_SHARE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isLiveScheduled(status: string | null | undefined): boolean {
  return (status ?? "live").trim().toLowerCase() === "live";
}

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
  const type = post.postType.toLowerCase();

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

  let imageUrl = `${base}/opengraph-image`;
  if (!post.is_anonymous) {
    const thumb = (post.thumbnail_url ?? "").trim();
    const media = (post.media_url ?? "").trim();
    if (thumb) imageUrl = absoluteOrHttps(thumb, base);
    else if (type === "image" && media) imageUrl = absoluteOrHttps(media, base);
  }

  return { title, description, imageUrl };
}

/**
 * Public, no-auth snapshot for share landing + Open Graph. Cached per request so
 * `generateMetadata` and the page share one round-trip.
 */
export const loadPostSharePublic = cache(async (id: string): Promise<PostSharePublic | null> => {
  if (!POST_SHARE_UUID_RE.test(id)) return null;
  const supabase = createPublicSupabaseAnonClient();
  if (!supabase) return null;

  const { data: post, error } = await supabase
    .from("posts")
    .select(
      "caption, thumbnail_url, media_url, type, scheduled_status, is_anonymous, creator_id, like_count, comment_count",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !post) return null;
  const row = post as {
    caption?: string | null;
    thumbnail_url?: string | null;
    media_url?: string | null;
    type?: string | null;
    scheduled_status?: string | null;
    is_anonymous?: boolean;
    creator_id?: string;
    like_count?: number | null;
    comment_count?: number | null;
  };

  if (!isLiveScheduled(row.scheduled_status)) return null;

  let creatorLine: string | null = null;
  if (!row.is_anonymous && row.creator_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", row.creator_id)
      .maybeSingle();
    const p = prof as { display_name?: string | null; username?: string | null } | null;
    if (p) {
      const u = (p.username ?? "").trim().replace(/^@/, "");
      const d = (p.display_name ?? "").trim();
      if (u) creatorLine = `PulseVerse · @${u}`;
      else if (d) creatorLine = `PulseVerse · ${d}`;
    }
    if (!creatorLine) creatorLine = "PulseVerse";
  }

  return {
    caption: String(row.caption ?? ""),
    thumbnail_url: row.thumbnail_url != null ? String(row.thumbnail_url) : null,
    media_url: row.media_url != null ? String(row.media_url) : null,
    postType: String(row.type ?? "text"),
    is_anonymous: Boolean(row.is_anonymous),
    like_count: Number(row.like_count ?? 0),
    comment_count: Number(row.comment_count ?? 0),
    creatorLine,
  };
});
