import Link from "next/link";

import type { WebAppEngagementCopy, WebAppFeedCopy } from "@/lib/marketing-copy/web-app";
import type { WebFeedResult, WebFeedTab } from "@/lib/web-app/feed-data";
import { cn } from "@/lib/utils";

import { WebVideoTheater } from "./web-video-theater";

const TAB_HREF: Record<WebFeedTab, string> = {
  foryou: "/web-app/feed",
  following: "/web-app/feed?tab=following",
  top: "/web-app/feed?tab=top",
};

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-semibold transition",
        active
          ? "bg-gradient-to-r from-primary to-accent text-white shadow-[0_0_22px_-8px_rgba(45,127,249,0.9)]"
          : "text-white/70 hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}

function CenteredCard({
  title,
  body,
  primaryHref,
  primaryLabel,
  openAppHref,
  openAppLabel,
  isExternalApp,
}: {
  title: string;
  body: string;
  primaryHref?: string;
  primaryLabel?: string;
  openAppHref: string;
  openAppLabel: string;
  isExternalApp: boolean;
}) {
  const externalProps = isExternalApp ? { target: "_blank", rel: "noreferrer" } : {};
  return (
    <div className="grid size-full place-items-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.85)] p-8 text-center backdrop-blur-xl">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mx-auto mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          {primaryHref && primaryLabel ? (
            <Link
              href={primaryHref}
              className="rounded-full bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {primaryLabel}
            </Link>
          ) : null}
          <a
            href={openAppHref}
            {...externalProps}
            className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-foreground/90 transition hover:border-white/30"
          >
            {openAppLabel}
          </a>
        </div>
      </div>
    </div>
  );
}

export function WebFeed({
  tab,
  result,
  copy,
  engagement,
  openAppHref,
  isExternalApp,
  currentUserId = null,
}: {
  tab: WebFeedTab;
  result: WebFeedResult;
  copy: WebAppFeedCopy;
  engagement: WebAppEngagementCopy;
  openAppHref: string;
  isExternalApp: boolean;
  currentUserId?: string | null;
}) {
  return (
    <div className="relative min-h-0 flex-1">
      {/* Stage / states fill the surface */}
      <div className="absolute inset-0">
        {result.state === "error" ? (
          <CenteredCard
            title={copy.errorTitle}
            body={copy.errorBody}
            primaryHref={TAB_HREF[tab]}
            primaryLabel={copy.retry}
            openAppHref={openAppHref}
            openAppLabel={copy.openInApp}
            isExternalApp={isExternalApp}
          />
        ) : result.state === "ok" && result.posts.length === 0 ? (
          <CenteredCard
            title={tab === "following" ? copy.followingEmptyTitle : copy.emptyTitle}
            body={tab === "following" ? copy.followingEmptyBody : copy.emptyBody}
            primaryHref={tab === "following" ? "/web-app/feed" : undefined}
            primaryLabel={tab === "following" ? copy.tabForYou : undefined}
            openAppHref={openAppHref}
            openAppLabel={copy.openInApp}
            isExternalApp={isExternalApp}
          />
        ) : result.state === "ok" ? (
          <WebVideoTheater
            posts={result.posts}
            feedCopy={copy}
            engagement={engagement}
            currentUserId={currentUserId}
            openAppHref={openAppHref}
            isExternalApp={isExternalApp}
          />
        ) : null}
      </div>

      {/* Floating feed tabs */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center p-3">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/45 p-1 backdrop-blur-xl">
          <Tab href={TAB_HREF.foryou} label={copy.tabForYou} active={tab === "foryou"} />
          <Tab href={TAB_HREF.following} label={copy.tabFollowing} active={tab === "following"} />
          <Tab href={TAB_HREF.top} label={copy.tabTop} active={tab === "top"} />
        </div>
      </div>
    </div>
  );
}
