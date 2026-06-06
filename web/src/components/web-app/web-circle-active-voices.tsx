import Link from "next/link";
import { Heart } from "lucide-react";

import type { CircleTopHelper } from "@/lib/circles/identity";
import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";
import { formatCount } from "@/lib/web-app/format";

export function WebCircleActiveVoices({
  helpers,
  copy,
}: {
  helpers: CircleTopHelper[];
  copy: WebAppCirclesCopy;
}) {
  if (helpers.length === 0) return null;
  return (
    <section className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.78)] p-4 backdrop-blur-sm sm:p-5">
      <div className="flex items-center gap-2">
        <Heart className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-bold text-foreground">{copy.activeVoicesTitle}</h2>
      </div>
      <ul className="mt-3 space-y-2">
        {helpers.map((helper, idx) => (
          <li key={helper.userId}>
            <Link
              href={`/web-app/user/${helper.userId}`}
              className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.04]"
            >
              <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                {idx + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground/90">
                {helper.displayName}
              </span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                {formatCount(helper.helpfulCount)} {copy.helpfulLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
