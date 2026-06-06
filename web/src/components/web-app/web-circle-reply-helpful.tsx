"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { ThumbsUp } from "lucide-react";

import { toggleCircleReplyHelpfulAction } from "@/app/web-app/actions";
import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";
import { formatCount } from "@/lib/web-app/format";

export function WebCircleReplyHelpful({
  replyId,
  initialCount,
  initialMarked,
  copy,
}: {
  replyId: string;
  initialCount: number;
  initialMarked: boolean;
  copy: WebAppCirclesCopy;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [marked, setMarked] = useState(initialMarked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = useCallback(() => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await toggleCircleReplyHelpfulAction(replyId);
      if (!res.ok) {
        if (res.reason === "auth") {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setError(
          res.reason === "blocked"
            ? copy.helpfulBlocked
            : res.reason === "unavailable"
              ? copy.helpfulUnavailable
              : copy.helpfulError,
        );
        return;
      }
      setMarked(res.reacted);
      setCount(res.helpfulCount);
    });
  }, [copy, pending, replyId, router]);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={marked}
        aria-label={marked ? copy.helpfulRemoveLabel : copy.helpfulMarkLabel}
        className={[
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50",
          marked
            ? "border-primary/50 bg-primary/15 text-primary"
            : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground",
        ].join(" ")}
      >
        <ThumbsUp className="size-3.5" aria-hidden />
        {copy.helpfulButtonLabel}
        {count > 0 ? ` · ${formatCount(count)}` : ""}
      </button>
      {error ? <p className="mt-1 text-[11px] text-rose-300/90">{error}</p> : null}
    </div>
  );
}
