"use client";

import { Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";
import type { CircleWeeklyPrompt } from "@/lib/circles/weekly-prompts";

export function WebCircleWeeklyPrompt({
  prompt,
  copy,
  onDismiss,
  onAnswerPrompt,
}: {
  prompt: CircleWeeklyPrompt;
  copy: WebAppCirclesCopy;
  onDismiss?: () => void;
  onAnswerPrompt?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function handleAnswer() {
    if (onAnswerPrompt) {
      onAnswerPrompt();
      return;
    }
    const base = pathname ?? "";
    const sep = base.includes("?") ? "&" : "?";
    router.replace(`${base}${sep}compose=question`);
  }

  return (
    <section className="rounded-3xl border border-primary/25 bg-[rgba(12,18,32,0.82)] p-4 shadow-[0_20px_60px_-44px_rgba(0,0,0,0.85)] backdrop-blur-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Sparkles className="size-3" aria-hidden />
          {copy.weeklyPromptBadge}
        </span>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-muted-foreground transition hover:text-foreground"
            aria-label={copy.weeklyPromptDismiss}
          >
            ✕
          </button>
        ) : null}
      </div>
      <h2 className="mt-3 font-heading text-base font-bold tracking-tight text-foreground [overflow-wrap:anywhere]">
        {prompt.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{prompt.body}</p>
      <button
        type="button"
        onClick={handleAnswer}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-teal-400 to-sky-500 px-4 py-2 text-sm font-semibold text-[#04121f] shadow-[0_10px_30px_-12px_rgba(20,184,166,0.75)] transition hover:brightness-110"
      >
        {prompt.cta}
      </button>
      <p className="mt-3 text-xs text-muted-foreground">{copy.weeklyPromptHint}</p>
    </section>
  );
}
