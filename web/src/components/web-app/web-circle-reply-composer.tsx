"use client";

import { Send } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createCircleReplyAction } from "@/app/web-app/actions";
import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";

const MAX = 300;

/**
 * Text-only Circle thread reply composer. Signed-in only (the thread route is
 * auth-gated). On success it `router.refresh()`es the server-rendered thread so
 * the new reply, masking, and reply count all come from the authoritative
 * loader — never an optimistic identity render, which would risk exposing a real
 * name on a confession/anonymous thread.
 */
export function WebCircleReplyComposer({
  slug,
  threadId,
  copy,
}: {
  slug: string;
  threadId: string;
  copy: WebAppCirclesCopy;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState("");
  const [errored, setErrored] = useState(false);
  const [membersOnly, setMembersOnly] = useState(false);
  const [pending, startTransition] = useTransition();

  const trimmed = value.trim();
  const overLimit = value.length > MAX;
  const canSubmit = trimmed.length > 0 && !overLimit && !pending;

  function submit() {
    if (!canSubmit) return;
    setErrored(false);
    setMembersOnly(false);
    const body = trimmed;
    startTransition(async () => {
      const res = await createCircleReplyAction(slug, threadId, body);
      if (!res.ok) {
        if (res.reason === "auth") {
          router.push(`/login?next=${encodeURIComponent(pathname ?? `/web-app/circles/${slug}`)}`);
          return;
        }
        // Membership can change between render and submit; surface a clear,
        // non-technical prompt rather than a generic failure.
        if (res.reason === "not_member") {
          setMembersOnly(true);
          return;
        }
        setErrored(true);
        return;
      }
      setValue("");
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
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
            if (membersOnly) setMembersOnly(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={MAX + 40}
          placeholder={copy.replyComposerPlaceholder}
          aria-label={copy.replyComposerPlaceholder}
          disabled={pending}
          className="max-h-32 min-h-[1.5rem] w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label={copy.replyComposerSubmit}
          title={copy.replyComposerSubmit}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-r from-teal-400 to-sky-500 text-[#04121f] shadow-[0_8px_24px_-10px_rgba(20,184,166,0.8)] transition enabled:hover:brightness-110 disabled:opacity-40"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1">
        <span className="text-[11px] text-amber-300/90">
          {membersOnly
            ? copy.replyMembersOnly
            : errored
              ? copy.replyComposerError
              : pending
                ? copy.replyComposerPosting
                : ""}
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
