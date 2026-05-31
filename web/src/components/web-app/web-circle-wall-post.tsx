"use client";

import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import { fetchPostCommentsAction } from "@/app/web-app/actions";
import type { WebAppFeedCopy } from "@/lib/marketing-copy/web-app";
import { formatCount } from "@/lib/web-app/format";

import { WebCommentsPanel, type WebCommentsState } from "./web-comments-panel";

/**
 * Circle wall post + inline comments. The card visuals are rendered server-side
 * and passed in as `card`; this wrapper only adds the on-demand comments panel,
 * which reuses the exact same `fetchPostCommentsAction` / `WebCommentsPanel` /
 * `createPostCommentAction` path as the Feed theater. Wall posts are standard
 * `posts`, so commenting needs no circle membership — the post-comment RLS
 * (visible + live + public/alias) is the only gate.
 */
export function WebCircleWallPost({
  card,
  postId,
  commentCount,
  toggleLabel,
  feedCopy,
  currentUserId,
}: {
  card: React.ReactNode;
  postId: string;
  commentCount: number;
  toggleLabel: string;
  feedCopy: WebAppFeedCopy;
  currentUserId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<WebCommentsState>({ status: "loading" });
  const [, startTransition] = useTransition();

  const load = useCallback(() => {
    setState({ status: "loading" });
    startTransition(async () => {
      try {
        const res = await fetchPostCommentsAction(postId);
        if (res.state === "ok") {
          setState({ status: "ok", comments: res.comments, total: res.total });
        } else {
          setState({ status: res.state === "unavailable" ? "unavailable" : "error" });
        }
      } catch {
        setState({ status: "error" });
      }
    });
  }, [postId]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next) load();
      return next;
    });
  }, [load]);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.86)] shadow-[0_24px_70px_-36px_rgba(0,0,0,0.9),0_0_0_1px_rgba(20,184,166,0.06)] backdrop-blur-sm">
      {card}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 border-t border-white/8 px-4 py-2.5 text-xs font-semibold text-foreground/80 transition hover:text-foreground"
      >
        <MessageCircle className="size-4 text-[var(--accent)]" aria-hidden />
        {toggleLabel}
        {commentCount > 0 ? (
          <span className="text-muted-foreground">{formatCount(commentCount)}</span>
        ) : null}
        {open ? (
          <ChevronUp className="ml-auto size-4" aria-hidden />
        ) : (
          <ChevronDown className="ml-auto size-4" aria-hidden />
        )}
      </button>
      {open ? (
        <div className="h-[min(60vh,440px)] border-t border-white/8">
          <WebCommentsPanel
            copy={feedCopy}
            state={state}
            postId={postId}
            captionSummary={null}
            fallbackCount={commentCount}
            currentUserId={currentUserId}
            onClose={() => setOpen(false)}
            onRetry={load}
            onPosted={load}
          />
        </div>
      ) : null}
    </div>
  );
}
