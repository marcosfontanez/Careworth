"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const motionEnter = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-both";

export function FaqAccordion({ items }: { items: readonly { q: string; a: string }[] }) {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(null);

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
              className="flex w-full items-start gap-3 p-4 text-left text-sm font-medium text-foreground outline-none hover:bg-white/[0.02] focus-visible:ring-2 focus-visible:ring-primary/40"
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
