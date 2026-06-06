"use client";

import { MessageSquarePlus, UserPlus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { toggleCircleMembershipAction } from "@/app/web-app/actions";
import type { CircleFlairTag } from "@/lib/circles/flairs";
import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";

import { WebCircleThreadComposer } from "./web-circle-thread-composer";

type ComposeMode = "discussion" | "question" | null;

export type WebCirclePromptPrefill = {
  title: string;
  body: string;
};

export function WebCircleStartDiscussion({
  slug,
  categories,
  isConfession,
  isMember,
  copy,
  promptPrefill = null,
}: {
  slug: string;
  categories: string[];
  isConfession: boolean;
  isMember: boolean;
  copy: WebAppCirclesCopy;
  promptPrefill?: WebCirclePromptPrefill | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const composeParam = searchParams.get("compose");
  const [mode, setMode] = useState<ComposeMode>(null);
  const [joinErrored, setJoinErrored] = useState(false);
  const [joinPending, startJoin] = useTransition();

  const clearComposeParam = useCallback(() => {
    if (composeParam !== "question") return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("compose");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : (pathname ?? `/web-app/circles/${slug}`));
  }, [composeParam, pathname, router, searchParams, slug]);

  useEffect(() => {
    if (composeParam === "question") {
      setMode("question");
    }
  }, [composeParam]);

  function closeComposer() {
    setMode(null);
    clearComposeParam();
  }

  function openDiscussion() {
    setMode("discussion");
  }

  function openQuestion() {
    setMode("question");
  }

  function joinToPost() {
    if (joinPending) return;
    setJoinErrored(false);
    startJoin(async () => {
      const res = await toggleCircleMembershipAction(slug);
      if (!res.ok) {
        if (res.reason === "auth") {
          const next = searchParams.toString()
            ? `${pathname}?${searchParams.toString()}`
            : (pathname ?? `/web-app/circles/${slug}`);
          router.push(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        setJoinErrored(true);
        return;
      }
      router.refresh();
    });
  }

  const questionPrefill =
    mode === "question" && promptPrefill
      ? { title: promptPrefill.title, body: promptPrefill.body }
      : null;

  if (mode) {
    return (
      <WebCircleThreadComposer
        slug={slug}
        categories={categories}
        isConfession={isConfession}
        copy={copy}
        postType={mode === "question" ? "question" : "thread"}
        defaultFlair={mode === "question" ? ("question" as CircleFlairTag) : null}
        initialTitle={questionPrefill?.title}
        initialBody={questionPrefill?.body}
        onCancel={closeComposer}
      />
    );
  }

  if (!isMember) {
    return (
      <section className="rounded-3xl border border-primary/25 bg-primary/[0.07] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">{copy.joinToPostTitle}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{copy.joinToPostBody}</p>
          </div>
          <button
            type="button"
            onClick={joinToPost}
            disabled={joinPending}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-teal-400 to-sky-500 px-4 py-2 text-sm font-semibold text-[#04121f] shadow-[0_10px_30px_-12px_rgba(20,184,166,0.8)] transition enabled:hover:brightness-110 disabled:opacity-60"
          >
            <UserPlus className="size-4" aria-hidden />
            {joinPending ? copy.joinPending : copy.joinCta}
          </button>
        </div>
        {joinErrored ? <p className="mt-2 text-[11px] text-amber-300/90">{copy.joinError}</p> : null}
      </section>
    );
  }

  return (
    <section className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={openDiscussion}
        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-teal-400 to-sky-500 px-4 py-2 text-sm font-semibold text-[#04121f] shadow-[0_10px_30px_-12px_rgba(20,184,166,0.8)] transition hover:brightness-110"
      >
        <MessageSquarePlus className="size-4" aria-hidden />
        {copy.startDiscussionCta}
      </button>
      <button
        type="button"
        onClick={openQuestion}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-foreground/90 transition hover:border-primary/35 hover:text-foreground"
      >
        {copy.askQuestionCta}
      </button>
    </section>
  );
}
