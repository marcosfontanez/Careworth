"use client";

import {
  getComposerFlairOptions,
  safetyNoteForFlairTag,
  type CircleFlairTag,
} from "@/lib/circles/flairs";
import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";

export function WebCircleComposerFlairPicker({
  slug,
  categories,
  selected,
  onSelect,
  isConfession,
  copy,
  disabled,
}: {
  slug: string;
  categories: string[];
  selected: CircleFlairTag | null;
  onSelect: (tag: CircleFlairTag | null) => void;
  isConfession: boolean;
  copy: WebAppCirclesCopy;
  disabled?: boolean;
}) {
  const options = getComposerFlairOptions(slug, categories);
  const safety = safetyNoteForFlairTag(selected);
  const hint = isConfession ? copy.threadComposerConfessionHint : copy.threadComposerFlairHint;

  return (
    <div>
      <p className="text-xs font-bold text-foreground">{copy.threadComposerFlairLabel}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => {
          const tag = opt.flairTag!;
          const active = selected === tag;
          return (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onSelect(active ? null : tag)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50",
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
      {safety ? (
        <p className="mt-2 text-[11px] italic leading-relaxed text-muted-foreground">{safety}</p>
      ) : null}
      {selected &&
      ["education", "career_advice", "student_help", "mythbuster", "caregiver_support"].includes(
        selected,
      ) ? (
        <p className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/8 px-3 py-2 text-[11px] leading-relaxed text-amber-100/90">
          {copy.threadComposerMedicalSafety}
        </p>
      ) : null}
    </div>
  );
}
