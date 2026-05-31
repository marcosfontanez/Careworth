import Link from "next/link";
import { Heart, MessageCircle, Play, UserRound } from "lucide-react";

import type { WebAppFeedCopy } from "@/lib/marketing-copy/web-app";
import type { WebFeedPost } from "@/lib/web-app/feed-data";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w`;
  return new Date(iso).toLocaleDateString();
}

export function WebFeedCard({
  post,
  copy,
  currentUserId = null,
}: {
  post: WebFeedPost;
  copy: WebAppFeedCopy;
  /** Signed-in viewer id, so own-author taps route to My Pulse. */
  currentUserId?: string | null;
}) {
  const media = post.thumbnailUrl ?? post.mediaUrl;
  const showImageMedia = Boolean(media);
  const time = relativeTime(post.createdAt);
  const authorName = post.isAnonymous ? copy.anonymousLabel : post.author?.displayName ?? "PulseVerse member";
  // Anonymous posts never link to a real profile (no identity leak).
  const profileHref =
    !post.isAnonymous && post.author?.id
      ? post.author.id === currentUserId
        ? "/web-app/my-pulse"
        : `/web-app/user/${post.author.id}`
      : null;

  const authorInner = (
    <>
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary/60 text-xs font-bold text-foreground/80">
        {!post.isAnonymous && post.author?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.author.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <UserRound className="size-4 text-muted-foreground" aria-hidden />
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{authorName}</p>
        {!post.isAnonymous && post.author?.username ? (
          <p className="truncate text-xs text-muted-foreground">@{post.author.username}</p>
        ) : post.isAnonymous ? (
          <p className="truncate text-xs text-muted-foreground">Confession</p>
        ) : null}
      </div>
    </>
  );

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.86)] shadow-[0_24px_70px_-36px_rgba(0,0,0,0.9),0_0_0_1px_rgba(20,184,166,0.06)] backdrop-blur-sm transition hover:border-white/15">
      {/* Author row */}
      <div className="flex items-center gap-3 px-4 pt-4">
        {profileHref ? (
          <Link href={profileHref} className="flex min-w-0 items-center gap-3 transition hover:opacity-80">
            {authorInner}
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-3">{authorInner}</div>
        )}
        {time ? <span className="ml-auto shrink-0 text-xs text-muted-foreground">{time}</span> : null}
      </div>

      {/* Caption */}
      {post.caption?.trim() ? (
        <p className="px-4 pt-3 text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
          {post.caption.length > 280 ? `${post.caption.slice(0, 280)}…` : post.caption}
        </p>
      ) : null}

      {/* Media */}
      {showImageMedia ? (
        <Link
          href={`/post/${post.id}`}
          className="group relative mt-3 block aspect-[4/5] w-full overflow-hidden bg-[#05080f] sm:aspect-video"
          aria-label={copy.openPost}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media ?? ""}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
          {post.isVideo ? (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              <Play className="size-3 fill-current" aria-hidden />
              {copy.videoBadge}
            </span>
          ) : null}
          {post.isVideo ? (
            <span className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid size-14 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition group-hover:scale-110">
                <Play className="size-6 fill-current" aria-hidden />
              </span>
            </span>
          ) : null}
        </Link>
      ) : null}

      {/* Footer: read-only stats + open */}
      <div className="flex items-center gap-4 px-4 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Heart className="size-4" aria-hidden />
          {formatCount(post.likeCount)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <MessageCircle className="size-4" aria-hidden />
          {formatCount(post.commentCount)}
        </span>
        <Link
          href={`/post/${post.id}`}
          className="ml-auto rounded-full border border-white/12 px-3.5 py-1.5 text-xs font-semibold text-foreground/90 transition hover:border-white/25 hover:text-foreground"
        >
          {copy.openPost}
        </Link>
      </div>
    </article>
  );
}
