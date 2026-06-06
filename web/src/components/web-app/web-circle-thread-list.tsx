"use client";

import { useMemo, useState } from "react";

import type { CircleFlairFilter, CircleFlairOption } from "@/lib/circles/flairs";
import { filterThreadsByFlair, safetyNoteForFlairFilter, visibleFlairOptionsForThreads } from "@/lib/circles/flairs";
import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";
import type { WebCircleThread } from "@/lib/web-app/circles-data";

import { WebCircleThreadRow } from "./web-circle-thread-row";

export function WebCircleThreadList({
  slug,
  threads,
  copy,
}: {
  slug: string;
  threads: WebCircleThread[];
  copy: WebAppCirclesCopy;
}) {
  const [flair, setFlair] = useState<CircleFlairFilter>("all");
  const options = useMemo(() => visibleFlairOptionsForThreads(threads), [threads]);
  const filtered = useMemo(() => filterThreadsByFlair(threads, flair), [threads, flair]);
  const safetyNote = safetyNoteForFlairFilter(flair);

  return (
    <>
      {options.length > 1 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {options.map((opt: CircleFlairOption) => {
            const active = flair === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFlair(opt.id)}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold transition",
                  active
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/20 hover:text-foreground",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {safetyNote ? (
        <p className="mb-3 rounded-2xl border border-amber-300/25 bg-amber-300/8 px-3.5 py-2.5 text-xs leading-relaxed text-amber-100/90">
          {safetyNote}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-8 text-center text-sm text-muted-foreground backdrop-blur-sm">
          {copy.flairFilterEmpty}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((thread) => (
            <WebCircleThreadRow key={thread.id} slug={slug} thread={thread} copy={copy} />
          ))}
        </div>
      )}
    </>
  );
}
