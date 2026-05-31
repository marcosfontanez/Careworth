import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck, Users } from "lucide-react";

import type { WebAppCirclesCopy, WebAppEngagementCopy, WebAppFeedCopy } from "@/lib/marketing-copy/web-app";
import type { WebCircle, WebCircleThread } from "@/lib/web-app/circles-data";
import type { WebFeedPost } from "@/lib/web-app/feed-data";
import { formatCount } from "@/lib/web-app/format";

import { WebCircleThreadRow } from "./web-circle-thread-row";
import { WebCircleWallPost } from "./web-circle-wall-post";
import { WebFeedCard } from "./web-feed-card";

export function WebCircleDetail({
  circle,
  isConfession,
  threads,
  wallPosts,
  copy,
  feedCopy,
  engagement,
  openAppHref,
  isExternalApp,
  currentUserId = null,
}: {
  circle: WebCircle;
  isConfession: boolean;
  threads: WebCircleThread[];
  wallPosts: WebFeedPost[];
  copy: WebAppCirclesCopy;
  feedCopy: WebAppFeedCopy;
  engagement: WebAppEngagementCopy;
  openAppHref: string;
  isExternalApp: boolean;
  currentUserId?: string | null;
}) {
  const externalProps = isExternalApp ? { target: "_blank", rel: "noreferrer" } : {};

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/web-app/circles"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {copy.backToCircles}
      </Link>

      {/* Circle header */}
      <header className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.86)] p-5 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-primary/20 to-accent/15 text-3xl">
            {circle.icon ?? "💬"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {circle.name}
              </h1>
              {circle.isPinned ? (
                <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  {copy.pinnedLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="size-4" aria-hidden />
              {formatCount(circle.memberCount)} {copy.membersLabel}
              <span aria-hidden>·</span>
              {formatCount(circle.postCount)} {copy.postsLabel}
            </p>
          </div>
          <a
            href={openAppHref}
            {...externalProps}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <ExternalLink className="size-4" aria-hidden />
            {copy.postInApp}
          </a>
        </div>

        {circle.description?.trim() ? (
          <p className="mt-4 text-sm leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
            {circle.description}
          </p>
        ) : null}

        {isConfession ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/8 p-3 text-xs leading-relaxed text-primary/90">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            {copy.confessionNote}
          </p>
        ) : null}
      </header>

      {/* Circle posts (wall) */}
      {wallPosts.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {copy.postsSectionTitle}
          </h2>
          <div className="flex flex-col gap-4">
            {wallPosts.map((post) => (
              <WebCircleWallPost
                key={post.id}
                postId={post.id}
                commentCount={post.commentCount}
                toggleLabel={copy.wallCommentLabel}
                feedCopy={feedCopy}
                currentUserId={currentUserId}
                card={
                  <WebFeedCard
                    post={post}
                    copy={feedCopy}
                    engagement={engagement}
                    currentUserId={currentUserId}
                    bare
                  />
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Threads */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {copy.threadsTitle}
        </h2>
        {threads.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-8 text-center text-sm text-muted-foreground backdrop-blur-sm">
            {copy.threadsEmpty}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {threads.map((thread) => (
              <WebCircleThreadRow key={thread.id} slug={circle.slug} thread={thread} copy={copy} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
