import { ShieldAlert } from "lucide-react";

import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";

export function WebCircleRulesCard({ rules, copy }: { rules: string[]; copy: WebAppCirclesCopy }) {
  if (rules.length === 0) return null;
  return (
    <section className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.78)] p-4 backdrop-blur-sm sm:p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-bold text-foreground">{copy.rulesTitle}</h2>
      </div>
      <ul className="mt-3 space-y-2">
        {rules.map((rule) => (
          <li
            key={rule}
            className="flex gap-2 text-sm leading-relaxed text-foreground/80 [overflow-wrap:anywhere]"
          >
            <span className="mt-2 size-1 shrink-0 rounded-full bg-primary/70" aria-hidden />
            {rule}
          </li>
        ))}
      </ul>
    </section>
  );
}
