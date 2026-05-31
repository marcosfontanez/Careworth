"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { togglePostLikeAction } from "@/app/web-app/actions";
import { formatCount } from "@/lib/web-app/format";

type Labels = { like: string; liked: string; error: string };

/**
 * Compact like toggle for native web post cards. Optimistic with rollback;
 * a failed mutation reverts and shows a small non-blocking error. Auth failures
 * route to login. Never renders for posts the loader couldn't surface safely.
 */
export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  labels,
  size = "md",
  variant = "inline",
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  labels: Labels;
  size?: "sm" | "md";
  /** `inline` = horizontal pill (cards); `rail` = vertical glass action (video theater). */
  variant?: "inline" | "rail";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(Math.max(0, initialCount));
  const [errored, setErrored] = useState(false);
  const [pending, startTransition] = useTransition();

  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  function onClick() {
    if (pending) return;
    setErrored(false);
    const next = !liked;
    // Optimistic.
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));

    startTransition(async () => {
      const res = await togglePostLikeAction(postId);
      if (!res.ok) {
        // Rollback.
        setLiked(!next);
        setCount((c) => Math.max(0, c + (next ? -1 : 1)));
        if (res.reason === "auth") {
          router.push(`/login?next=${encodeURIComponent(pathname ?? "/web-app/feed")}`);
          return;
        }
        setErrored(true);
        return;
      }
      // Reconcile with server truth.
      setLiked(res.active);
    });
  }

  if (variant === "rail") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={liked}
        aria-label={liked ? labels.liked : labels.like}
        title={errored ? labels.error : liked ? labels.liked : labels.like}
        className="group/like flex flex-col items-center gap-1 disabled:opacity-60"
      >
        <span
          className={[
            "grid size-11 place-items-center rounded-full border backdrop-blur-md transition group-active/like:scale-90",
            liked
              ? "border-rose-400/50 bg-rose-500/25 text-rose-300 shadow-[0_0_18px_-4px_rgba(244,63,94,0.8)]"
              : "border-white/15 bg-white/10 text-white hover:bg-white/15",
            errored ? "border-amber-400/60" : "",
          ].join(" ")}
        >
          <Heart className={`size-5 ${liked ? "fill-current" : ""}`} aria-hidden />
        </span>
        <span className="text-[11px] font-semibold text-white/90">{formatCount(count)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? labels.liked : labels.like}
      title={errored ? labels.error : liked ? labels.liked : labels.like}
      className={[
        "inline-flex items-center gap-1.5 rounded-full transition disabled:opacity-60",
        textSize,
        liked ? "text-rose-400" : "text-muted-foreground hover:text-foreground",
        errored ? "text-amber-400" : "",
      ].join(" ")}
    >
      <Heart className={`${iconSize} ${liked ? "fill-current" : ""}`} aria-hidden />
      {formatCount(count)}
    </button>
  );
}
