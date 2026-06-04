import Link from "next/link";
import { MessageCircle, Play, UserRound } from "lucide-react";

import type { WebAppEngagementCopy, WebAppFeedCopy } from "@/lib/marketing-copy/web-app";
import type { WebFeedPost } from "@/lib/web-app/feed-data";
import { formatCount, relativeTime } from "@/lib/web-app/format";

import { LikeButton } from "./like-button";

export function WebFeedCard({
  post,
  copy,
  engagement,
  currentUserId = null,
  bare = false,
}: {
  post: WebFeedPost;
  copy: WebAppFeedCopy;
  engagement: WebAppEngagementCopy;
  /** Signed-in viewer id, so own-author taps route to My Pulse. */
  currentUserId?: string | null;
  /** Drop the outer card chrome so the card can be nested (e.g. Circle wall post + comments). */
  bare?: boolean;
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
    <article
      className={
        bare
          ? "overflow-hidden"
          : "overflow-hidden rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.86)] shadow-[0_24px_70px_-36px_rgba(0,0,0,0.9),0_0_0_1px_rgba(20,184,166,0.06)] backdrop-blur-sm transition hover:border-white/15"
      }
    >
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
          href={`/web-app/post/${post.id}`}
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

      {/* Footer: like (interactive) + read-only comments + open */}
      <div className="flex items-center gap-4 px-4 py-3.5">
        <LikeButton
          postId={post.id}
          initialLiked={post.likedByViewer}
          initialCount={post.likeCount}
          labels={{ like: engagement.like, liked: engagement.liked, error: engagement.likeError }}
        />
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <MessageCircle className="size-4" aria-hidden />
          {formatCount(post.commentCount)}
        </span>
        <Link
          href={`/web-app/post/${post.id}`}
          className="ml-auto rounded-full border border-white/12 px-3.5 py-1.5 text-xs font-semibold text-foreground/90 transition hover:border-white/25 hover:text-foreground"
        >
          {copy.openPost}
        </Link>
      </div>
    </article>
  );
}
