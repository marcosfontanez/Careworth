"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const motionEnter = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-both";

function findHighlightIndex(items: readonly { q: string; a: string }[], highlightQuery?: string | null): number {
  const normalized = highlightQuery?.trim().toLowerCase();
  if (!normalized) return -1;
  const exact = items.findIndex((item) => item.q.toLowerCase() === normalized);
  if (exact >= 0) return exact;
  return items.findIndex(
    (item) => item.q.toLowerCase().includes(normalized) || item.a.toLowerCase().includes(normalized),
  );
}

export function FaqAccordion({
  items,
  highlightQuery,
}: {
  items: readonly { q: string; a: string }[];
  highlightQuery?: string | null;
}) {
  const baseId = useId();
  const highlightIndex = useMemo(() => findHighlightIndex(items, highlightQuery), [highlightQuery, items]);
  const [open, setOpen] = useState<number | null>(highlightIndex >= 0 ? highlightIndex : null);

  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card/40">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${baseId}-panel-${i}`;
        const buttonId = `${baseId}-trigger-${i}`;
        return (
          <li key={item.q}>
            <button
              id={buttonId}
              type="button"
              className="flex w-full items-start gap-3 p-4 text-left text-sm font-medium text-foreground outline-none hover:bg-white/2 focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <ChevronDown
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition",
                  isOpen && "rotate-180",
                )}
                aria-hidden
              />
              <span>{item.q}</span>
            </button>
            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={cn("border-t border-border px-4 pb-4 pl-11 text-sm text-muted-foreground", motionEnter)}
              >
                {item.a}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
