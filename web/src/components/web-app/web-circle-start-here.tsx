import Link from "next/link";
import { Compass, Pin, ShieldCheck } from "lucide-react";

import type { WebCircleWelcomeThread } from "@/lib/web-app/circles-data";

export function WebCircleStartHere({
  copy,
  welcomeThread,
  isConfession,
  slug,
}: {
  copy: string;
  welcomeThread: WebCircleWelcomeThread | null;
  isConfession: boolean;
  slug: string;
}) {
  return (
    <section className="rounded-3xl border border-primary/20 bg-[rgba(12,18,32,0.82)] p-4 shadow-[0_20px_60px_-44px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
          {isConfession ? (
            <ShieldCheck className="size-4" aria-hidden />
          ) : (
            <Compass className="size-4" aria-hidden />
          )}
        </span>
        <h2 className="text-sm font-bold text-foreground">Start here</h2>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">{copy}</p>
      {welcomeThread?.title ? (
        <Link
          href={`/web-app/circles/${encodeURIComponent(slug)}/thread/${welcomeThread.id}`}
          className="mt-3 flex items-center gap-2 rounded-2xl border border-primary/25 bg-[rgba(18,26,44,0.55)] px-3.5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary/40"
        >
          <Pin className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{welcomeThread.title}</span>
        </Link>
      ) : null}
    </section>
  );
}
