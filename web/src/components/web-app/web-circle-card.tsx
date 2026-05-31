import Link from "next/link";
import { Users } from "lucide-react";

import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";
import type { WebCircle } from "@/lib/web-app/circles-data";
import { formatCount } from "@/lib/web-app/format";

export function WebCircleCard({ circle, copy }: { circle: WebCircle; copy: WebAppCirclesCopy }) {
  return (
    <Link
      href={`/web-app/circles/${encodeURIComponent(circle.slug)}`}
      className="group flex flex-col rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.82)] p-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm transition hover:border-primary/30 hover:bg-[rgba(18,26,44,0.9)]"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary/20 to-accent/15 text-2xl">
          {circle.icon ?? "💬"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-heading text-base font-bold tracking-tight text-foreground">
              {circle.name}
            </h3>
            {circle.isPinned ? (
              <span className="shrink-0 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                {copy.pinnedLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" aria-hidden />
            {formatCount(circle.memberCount)} {copy.membersLabel}
          </p>
        </div>
      </div>
      {circle.description?.trim() ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {circle.description}
        </p>
      ) : null}
    </Link>
  );
}
