import Link from "next/link";

import type { WebAppFeedCopy } from "@/lib/marketing-copy/web-app";
import type { WebFeedResult, WebFeedTab } from "@/lib/web-app/feed-data";
import { cn } from "@/lib/utils";

import { WebFeedCard } from "./web-feed-card";

function Tab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-semibold transition",
        active
          ? "bg-gradient-to-r from-primary to-accent text-white shadow-[0_0_22px_-8px_rgba(45,127,249,0.9)]"
          : "border border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function WebFeed({
  tab,
  result,
  copy,
  openAppHref,
  isExternalApp,
}: {
  tab: WebFeedTab;
  result: WebFeedResult;
  copy: WebAppFeedCopy;
  openAppHref: string;
  isExternalApp: boolean;
}) {
  const externalProps = isExternalApp ? { target: "_blank", rel: "noreferrer" } : {};

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-5">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
      </header>

      <div className="mb-6 flex items-center gap-2">
        <Tab href="/web-app/feed" label={copy.tabForYou} active={tab === "foryou"} />
        <Tab href="/web-app/feed?tab=top" label={copy.tabTop} active={tab === "top"} />
      </div>

      {result.state === "error" ? (
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.8)] p-8 text-center backdrop-blur-sm">
          <p className="text-base font-semibold text-foreground">{copy.errorTitle}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {copy.errorBody}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href={tab === "top" ? "/web-app/feed?tab=top" : "/web-app/feed"}
              className="rounded-full bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {copy.retry}
            </Link>
            <a
              href={openAppHref}
              {...externalProps}
              className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-foreground/90 transition hover:border-white/30"
            >
              {copy.openInApp}
            </a>
          </div>
        </div>
      ) : result.state === "ok" && result.posts.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.8)] p-8 text-center backdrop-blur-sm">
          <p className="text-base font-semibold text-foreground">{copy.emptyTitle}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {copy.emptyBody}
          </p>
          <a
            href={openAppHref}
            {...externalProps}
            className="mt-5 inline-block rounded-full bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {copy.openInApp}
          </a>
        </div>
      ) : result.state === "ok" ? (
        <div className="flex flex-col gap-5">
          {result.posts.map((post) => (
            <WebFeedCard key={post.id} post={post} copy={copy} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
