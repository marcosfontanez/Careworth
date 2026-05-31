import Link from "next/link";
import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";

import type { WebAppComingSoonCopy } from "@/lib/marketing-copy/web-app";

export function WebAppComingSoon({
  copy,
  openAppHref,
  isExternalApp,
}: {
  copy: WebAppComingSoonCopy;
  openAppHref: string;
  isExternalApp: boolean;
}) {
  const externalProps = isExternalApp ? { target: "_blank", rel: "noreferrer" } : {};

  return (
    <div className="grid min-h-full place-items-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.86)] p-8 text-center shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9),0_0_0_1px_rgba(20,184,166,0.08)] backdrop-blur-md">
        <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          <Sparkles className="size-3.5" aria-hidden />
          {copy.badge}
        </span>
        <h1 className="mt-4 font-heading text-xl font-bold tracking-tight text-foreground">
          {copy.title}
        </h1>
        <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {copy.body}
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <a
            href={openAppHref}
            {...externalProps}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 sm:w-auto"
          >
            <ExternalLink className="size-4" aria-hidden />
            {copy.openInApp}
          </a>
          <Link
            href="/web-app/feed"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-foreground/90 transition hover:border-white/30 sm:w-auto"
          >
            {copy.goToFeed}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
