"use client";

import { Send } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createPostCommentAction } from "@/app/web-app/actions";
import type { WebAppFeedCopy } from "@/lib/marketing-copy/web-app";

const MAX = 300;

/**
 * Text-only top-level comment composer for the Feed theater comments panel.
 * Signed-in only (the panel renders a login CTA otherwise). On success the
 * parent re-fetches the thread (`onPosted`) so masking/identity stay correct
 * and the count reconciles — no optimistic identity rendering, which would risk
 * leaking a real name onto an anonymous/confession post.
 */
export function WebCommentComposer({
  postId,
  copy,
  onPosted,
}: {
  postId: string;
  copy: WebAppFeedCopy;
  onPosted: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState("");
  const [errored, setErrored] = useState(false);
  const [pending, startTransition] = useTransition();

  const trimmed = value.trim();
  const overLimit = value.length > MAX;
  const canSubmit = trimmed.length > 0 && !overLimit && !pending;

  function submit() {
    if (!canSubmit) return;
    setErrored(false);
    const body = trimmed;
    startTransition(async () => {
      const res = await createPostCommentAction(postId, body);
      if (!res.ok) {
        if (res.reason === "auth") {
          router.push(`/login?next=${encodeURIComponent(pathname ?? "/web-app/feed")}`);
          return;
        }
        setErrored(true);
        return;
      }
      setValue("");
      onPosted();
    });
  }

  return (
    <div className="border-t border-white/8 px-4 py-3">
      <div
        className={[
          "flex items-end gap-2 rounded-2xl border bg-white/[0.04] px-3 py-2 transition focus-within:border-primary/40",
          errored ? "border-amber-400/60" : "border-white/12",
        ].join(" ")}
      >
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (errored) setErrored(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={MAX + 40}
          placeholder={copy.composerPlaceholder}
          aria-label={copy.composerPlaceholder}
          disabled={pending}
          className="max-h-28 min-h-[1.5rem] w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label={copy.composerSubmit}
          title={copy.composerSubmit}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-r from-teal-400 to-sky-500 text-[#04121f] shadow-[0_8px_24px_-10px_rgba(20,184,166,0.8)] transition enabled:hover:brightness-110 disabled:opacity-40"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1">
        <span className="text-[11px] text-amber-300/90">
          {errored ? copy.composerError : pending ? copy.composerPosting : ""}
        </span>
        <span
          className={[
            "text-[11px] tabular-nums",
            overLimit ? "text-amber-400" : "text-muted-foreground",
          ].join(" ")}
        >
          {value.length}/{MAX}
        </span>
      </div>
    </div>
  );
}
