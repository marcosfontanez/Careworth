"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ExternalLink, ShieldCheck, Users } from "lucide-react";

import type { CircleTopHelper } from "@/lib/circles/identity";
import type { WebAppCirclesCopy, WebAppEngagementCopy, WebAppFeedCopy } from "@/lib/marketing-copy/web-app";
import type {
  WebCircle,
  WebCircleIdentity,
  WebCircleThread,
  WebCircleWelcomeThread,
} from "@/lib/web-app/circles-data";
import type { WebFeedPost } from "@/lib/web-app/feed-data";
import { formatCount } from "@/lib/web-app/format";

import { WebCircleActiveVoices } from "./web-circle-active-voices";
import { WebCircleJoinButton } from "./web-circle-join-button";
import { WebCircleRulesCard } from "./web-circle-rules-card";
import { WebCircleStartDiscussion } from "./web-circle-start-discussion";
import { WebCircleStartHere } from "./web-circle-start-here";
import { WebCircleVisitTracker } from "./web-circle-visit-tracker";
import { WebCircleThreadList } from "./web-circle-thread-list";
import { WebCircleWallPost } from "./web-circle-wall-post";
import { WebCircleWeeklyPrompt } from "./web-circle-weekly-prompt";
import { WebFeedCard } from "./web-feed-card";

export function WebCircleDetail({
  circle,
  isConfession,
  identity,
  welcomeThread,
  topHelpers,
  threads,
  wallPosts,
  copy,
  feedCopy,
  engagement,
  openAppHref,
  isExternalApp,
  currentUserId = null,
  isMember = false,
  categories = [],
}: {
  circle: WebCircle;
  isConfession: boolean;
  identity: WebCircleIdentity;
  welcomeThread: WebCircleWelcomeThread | null;
  topHelpers: CircleTopHelper[];
  threads: WebCircleThread[];
  wallPosts: WebFeedPost[];
  copy: WebAppCirclesCopy;
  feedCopy: WebAppFeedCopy;
  engagement: WebAppEngagementCopy;
  openAppHref: string;
  isExternalApp: boolean;
  currentUserId?: string | null;
  isMember?: boolean;
  categories?: string[];
}) {
  const externalProps = isExternalApp ? { target: "_blank", rel: "noreferrer" } : {};
  const [weeklyDismissed, setWeeklyDismissed] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6 sm:py-8">
      <WebCircleVisitTracker communityId={circle.id} />
      <Link
        href="/web-app/circles"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {copy.backToCircles}
      </Link>

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
          <div className="flex shrink-0 flex-col items-stretch gap-2">
            <WebCircleJoinButton slug={circle.slug} initialJoined={isMember} copy={copy} />
            <a
              href={openAppHref}
              {...externalProps}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-foreground/90 transition hover:border-white/25"
            >
              <ExternalLink className="size-4" aria-hidden />
              {copy.postInApp}
            </a>
          </div>
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

      <div className="mt-6 flex flex-col gap-4">
        <WebCircleStartDiscussion
          slug={circle.slug}
          categories={categories}
          isConfession={isConfession}
          isMember={isMember}
          copy={copy}
          promptPrefill={{
            title: identity.weeklyPrompt.title,
            body: identity.weeklyPrompt.body,
          }}
        />
        <WebCircleStartHere
          copy={identity.welcomeCopy}
          welcomeThread={welcomeThread}
          isConfession={isConfession}
          slug={circle.slug}
        />
        {!weeklyDismissed ? (
          <WebCircleWeeklyPrompt
            prompt={identity.weeklyPrompt}
            copy={copy}
            onDismiss={() => setWeeklyDismissed(true)}
          />
        ) : null}
        <WebCircleRulesCard rules={identity.rules} copy={copy} />
        {!isConfession ? <WebCircleActiveVoices helpers={topHelpers} copy={copy} /> : null}
      </div>

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

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {copy.threadsTitle}
        </h2>
        {threads.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-8 text-center text-sm text-muted-foreground backdrop-blur-sm">
            {copy.threadsEmpty}
          </div>
        ) : (
          <WebCircleThreadList slug={circle.slug} threads={threads} copy={copy} />
        )}
      </section>
    </div>
  );
}
