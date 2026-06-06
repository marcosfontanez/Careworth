import Link from "next/link";
import { ArrowRight, Pin, Users } from "lucide-react";

import type { CircleActivityBadgeLabel } from "@/lib/circles/activity-badges";
import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";
import type { WebCircle } from "@/lib/web-app/circles-data";
import { formatCount } from "@/lib/web-app/format";

const BADGE_TONE: Record<CircleActivityBadgeLabel["tone"], string> = {
  reply: "border-teal-300/40 bg-teal-300/10 text-teal-100",
  post: "border-sky-300/40 bg-sky-300/10 text-sky-100",
  question: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  hot: "border-rose-300/40 bg-rose-300/10 text-rose-100",
};

export function WebCircleCard({
  circle,
  copy,
  badge = null,
}: {
  circle: WebCircle;
  copy: WebAppCirclesCopy;
  badge?: CircleActivityBadgeLabel | null;
}) {
  return (
    <Link
      href={`/web-app/circles/${encodeURIComponent(circle.slug)}`}
      className="group flex flex-col rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.82)] p-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm transition hover:border-primary/30 hover:bg-[rgba(18,26,44,0.92)] hover:shadow-[0_24px_70px_-38px_rgba(0,0,0,0.95),0_0_30px_-16px_rgba(20,184,166,0.5)]"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary/25 to-accent/15 text-2xl shadow-[0_0_18px_-6px_rgba(45,127,249,0.6)]">
          {circle.icon ?? "💬"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-heading text-base font-bold tracking-tight text-foreground">
              {circle.name}
            </h3>
            {circle.isPinned ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                <Pin className="size-2.5" aria-hidden />
                {copy.pinnedLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" aria-hidden />
            {formatCount(circle.memberCount)} {copy.membersLabel}
            {badge ? (
              <span
                className={[
                  "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  BADGE_TONE[badge.tone],
                ].join(" ")}
              >
                {badge.text}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {circle.description?.trim() ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {circle.description}
        </p>
      ) : null}

      <span className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-foreground/90 transition group-hover:border-primary/40 group-hover:text-foreground">
        {copy.viewLabel}
        <ArrowRight className="size-3.5" aria-hidden />
      </span>
    </Link>
  );
}
