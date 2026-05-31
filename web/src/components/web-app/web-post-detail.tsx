"use client";

import Link from "next/link";
import { ArrowLeft, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchPostCommentsAction } from "@/app/web-app/actions";
import type { WebAppEngagementCopy, WebAppFeedCopy } from "@/lib/marketing-copy/web-app";
import type { WebFeedPost } from "@/lib/web-app/feed-data";
import { relativeTime } from "@/lib/web-app/format";

import { LikeButton } from "./like-button";
import { WebCommentsPanel, type WebCommentsState } from "./web-comments-panel";

/**
 * Native web single-post view. Shows the post (inline video / image, caption,
 * author) plus the same comments experience as the Feed theater — fetched via
 * the shared `fetchPostCommentsAction` and posted through `createPostCommentAction`.
 * Visibility/masking is decided server-side by `loadWebPost`.
 */
export function WebPostDetail({
  post,
  feedCopy,
  engagement,
  currentUserId,
  backHref,
  backLabel,
}: {
  post: WebFeedPost;
  feedCopy: WebAppFeedCopy;
  engagement: WebAppEngagementCopy;
  currentUserId: string | null;
  backHref: string;
  backLabel: string;
}) {
  const [comments, setComments] = useState<WebCommentsState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPostCommentsAction(post.id)
      .then((res) => {
        if (cancelled) return;
        if (res.state === "ok") {
          setComments({ status: "ok", comments: res.comments, total: res.total });
        } else {
          setComments({ status: res.state === "unavailable" ? "unavailable" : "error" });
        }
      })
      .catch(() => {
        if (!cancelled) setComments({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [post.id, reloadKey]);

  const time = relativeTime(post.createdAt);
  const media = post.mediaUrl ?? post.thumbnailUrl;
  const authorName = post.isAnonymous ? feedCopy.anonymousLabel : post.author?.displayName ?? "PulseVerse member";
  const profileHref =
    !post.isAnonymous && post.author?.id
      ? post.author.id === currentUserId
        ? "/web-app/my-pulse"
        : `/web-app/user/${post.author.id}`
      : null;

  const authorInner = (
    <>
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary/60">
        {!post.isAnonymous && post.author?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.author.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <UserRound className="size-4 text-muted-foreground" aria-hidden />
        )}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">{authorName}</span>
          {post.isAnonymous ? <ShieldCheck className="size-3.5 shrink-0 text-primary/80" aria-hidden /> : null}
        </span>
        {!post.isAnonymous && post.author?.username ? (
          <span className="block truncate text-xs text-muted-foreground">@{post.author.username}</span>
        ) : null}
      </span>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {backLabel}
      </Link>

      <article className="overflow-hidden rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.86)] shadow-[0_24px_70px_-36px_rgba(0,0,0,0.9),0_0_0_1px_rgba(20,184,166,0.06)] backdrop-blur-sm">
        {/* Author */}
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
          <p className="whitespace-pre-line px-4 pt-3 text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
            {post.caption}
          </p>
        ) : null}

        {/* Media — video plays inline on web; images render full */}
        {media ? (
          <div className="mt-3 w-full overflow-hidden bg-[#05080f]">
            {post.isVideo && post.mediaUrl ? (
              <video
                src={post.mediaUrl}
                poster={post.thumbnailUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                className="max-h-[70vh] w-full object-contain"
              >
                <track kind="captions" />
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media} alt="" className="max-h-[70vh] w-full object-contain" />
            )}
          </div>
        ) : null}

        {/* Footer: like + comment count */}
        <div className="flex items-center gap-4 px-4 py-3.5">
          <LikeButton
            postId={post.id}
            initialLiked={post.likedByViewer}
            initialCount={post.likeCount}
            labels={{ like: engagement.like, liked: engagement.liked, error: engagement.likeError }}
          />
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageCircle className="size-4" aria-hidden />
            {comments.status === "ok" ? comments.total : post.commentCount}
          </span>
        </div>
      </article>

      {/* Comments */}
      <div className="mt-5 h-[min(70vh,560px)] overflow-hidden rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] backdrop-blur-sm">
        <WebCommentsPanel
          copy={feedCopy}
          state={comments}
          postId={post.id}
          captionSummary={null}
          fallbackCount={post.commentCount}
          currentUserId={currentUserId}
          onClose={() => {}}
          onRetry={() => setReloadKey((k) => k + 1)}
          onPosted={() => setReloadKey((k) => k + 1)}
          hideClose
        />
      </div>
    </div>
  );
}
