"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card/40">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={i}>
            <button
              type="button"
              className="flex w-full items-start gap-3 p-4 text-left text-sm font-medium"
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <ChevronDown
                className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition", isOpen && "rotate-180")}
              />
              <span>{item.q}</span>
            </button>
            {isOpen && <div className="border-t border-border px-4 pb-4 pl-11 text-sm text-muted-foreground">{item.a}</div>}
          </li>
        );
      })}
    </ul>
  );
}
