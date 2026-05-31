"use client";

import Link from "next/link";
import { LogIn, MessageCircle, RefreshCw, ShieldCheck, UserRound, X } from "lucide-react";

import type { WebAppFeedCopy } from "@/lib/marketing-copy/web-app";
import type { WebComment } from "@/lib/web-app/comments-data";
import { formatCount, relativeTime } from "@/lib/web-app/format";

import { WebCommentComposer } from "./web-comment-composer";

export type WebCommentsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "unavailable" }
  | { status: "ok"; comments: WebComment[]; total: number };

/**
 * Read-only comments panel for the Feed theater. Presentational only — the
 * theater owns the fetch state so a single load serves both the desktop rail
 * and the mobile drawer mounts. No write affordances: replies deep-link to the
 * app. Anonymous authors never expose a profile link.
 */
export function WebCommentsPanel({
  copy,
  state,
  postId,
  captionSummary,
  fallbackCount,
  currentUserId,
  onClose,
  onRetry,
  onPosted,
  hideClose = false,
}: {
  copy: WebAppFeedCopy;
  state: WebCommentsState;
  /** Target post for the composer. */
  postId: string;
  captionSummary: string | null;
  fallbackCount: number;
  currentUserId: string | null;
  onClose: () => void;
  onRetry: () => void;
  /** Called after a successful comment post so the parent re-fetches. */
  onPosted: () => void;
  /** Hide the close (X) button when the panel is embedded as a page section. */
  hideClose?: boolean;
}) {
  const total = state.status === "ok" ? state.total : fallbackCount;
  // The composer is only meaningful once we've confirmed the post is readable
  // and live (state "ok"); hidden on unavailable/error so we never offer to post
  // onto something the viewer can't actually comment on.
  const canCompose = Boolean(currentUserId) && state.status === "ok";

  return (
    <div className="flex size-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <MessageCircle className="size-4 text-[var(--accent)]" aria-hidden />
          {copy.commentsPanelTitle}
          <span className="text-xs font-semibold text-muted-foreground">{formatCount(total)}</span>
        </h2>
        {hideClose ? null : (
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.commentsCloseLabel}
            className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:text-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {/* Post caption summary */}
      {captionSummary ? (
        <p className="line-clamp-2 border-b border-white/8 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {captionSummary}
        </p>
      ) : null}

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {state.status === "loading" ? (
          <ul className="space-y-4" aria-label={copy.commentsLoading}>
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex gap-2.5">
                <span className="size-8 shrink-0 animate-pulse rounded-full bg-white/8" />
                <span className="flex-1 space-y-1.5">
                  <span className="block h-3 w-24 animate-pulse rounded bg-white/8" />
                  <span className="block h-3 w-full animate-pulse rounded bg-white/8" />
                  <span className="block h-3 w-3/4 animate-pulse rounded bg-white/8" />
                </span>
              </li>
            ))}
          </ul>
        ) : state.status === "error" ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-sm font-semibold text-foreground">{copy.commentsErrorTitle}</p>
            <p className="max-w-[16rem] text-xs text-muted-foreground">{copy.commentsErrorBody}</p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-white/15"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {copy.commentsRetry}
            </button>
          </div>
        ) : state.status === "unavailable" || state.comments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/5">
              <MessageCircle className="size-5 text-muted-foreground" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-foreground">{copy.commentsEmptyTitle}</p>
            <p className="max-w-[16rem] text-xs text-muted-foreground">{copy.commentsEmptyBody}</p>
          </div>
        ) : (
          <ul className="space-y-3.5">
            {state.comments.map((c) => (
              <CommentRow key={c.id} comment={c} copy={copy} currentUserId={currentUserId} />
            ))}
          </ul>
        )}
      </div>

      {/* Composer (signed-in) / login CTA (signed-out) */}
      {canCompose ? (
        <WebCommentComposer postId={postId} copy={copy} onPosted={onPosted} />
      ) : !currentUserId ? (
        <div className="border-t border-white/8 px-4 py-3">
          <Link
            href="/login?next=/web-app/feed"
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-white/15"
          >
            <LogIn className="size-3.5" aria-hidden />
            {copy.composerLoginCta}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function CommentRow({
  comment,
  copy,
  currentUserId,
}: {
  comment: WebComment;
  copy: WebAppFeedCopy;
  currentUserId: string | null;
}) {
  const author = comment.author;
  const name = author?.displayName ?? copy.anonymousLabel;
  const time = relativeTime(comment.createdAt);
  const profileHref =
    author?.id && !comment.isAnonymous
      ? author.id === currentUserId
        ? "/web-app/my-pulse"
        : `/web-app/user/${author.id}`
      : null;

  const avatar = (
    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary/60">
      {author?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={author.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <UserRound className="size-4 text-muted-foreground" aria-hidden />
      )}
    </span>
  );

  return (
    <li className="flex gap-2.5">
      {profileHref ? (
        <Link href={profileHref} className="shrink-0">
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {profileHref ? (
            <Link href={profileHref} className="truncate text-xs font-bold text-foreground hover:underline">
              {name}
            </Link>
          ) : (
            <span className="truncate text-xs font-bold text-foreground">{name}</span>
          )}
          {comment.isAnonymous ? (
            <ShieldCheck className="size-3 shrink-0 text-primary/80" aria-hidden />
          ) : null}
          {time ? <span className="shrink-0 text-[11px] text-muted-foreground">· {time}</span> : null}
          {comment.edited ? (
            <span className="shrink-0 text-[11px] text-muted-foreground">· {copy.editedLabel}</span>
          ) : null}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
          {comment.body.trim() ? comment.body : comment.hasMedia ? copy.commentsMediaLabel : ""}
        </p>
        {comment.replyCount > 0 ? (
          <span className="mt-1 inline-block text-[11px] font-medium text-muted-foreground">
            {formatCount(comment.replyCount)} {copy.repliesLabel}
          </span>
        ) : null}
      </div>
    </li>
  );
}
