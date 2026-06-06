"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Heart, UserRound } from "lucide-react";

import type { CircleReplySort } from "@/lib/circles/reply-sort";
import { sortCircleReplies } from "@/lib/circles/reply-sort";
import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";
import type { WebCircleAuthor, WebCircleReply } from "@/lib/web-app/circles-data";
import { relativeTime } from "@/lib/web-app/format";

import { WebCircleReplyHelpful } from "./web-circle-reply-helpful";

function Byline({
  author,
  isAnonymous,
  time,
  copy,
}: {
  author: WebCircleAuthor | null;
  isAnonymous: boolean;
  time: string | null;
  copy: WebAppCirclesCopy;
}) {
  const name = isAnonymous ? copy.anonymousLabel : author?.displayName ?? copy.anonymousLabel;
  const showAvatar = !isAnonymous && author?.avatarUrl;
  const linkHref = !isAnonymous && author?.id ? `/web-app/user/${author.id}` : null;

  const inner = (
    <>
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary/60">
        {showAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author!.avatarUrl!} alt="" className="size-full object-cover" />
        ) : (
          <UserRound className="size-4 text-muted-foreground" aria-hidden />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
        {!isAnonymous && author?.username ? (
          <span className="block truncate text-xs text-muted-foreground">@{author.username}</span>
        ) : null}
      </span>
    </>
  );

  return (
    <div className="flex items-center gap-2.5">
      {linkHref ? (
        <Link href={linkHref} className="flex min-w-0 items-center gap-2.5 transition hover:opacity-80">
          {inner}
        </Link>
      ) : (
        <div className="flex min-w-0 items-center gap-2.5">{inner}</div>
      )}
      {time ? <span className="ml-auto shrink-0 text-xs text-muted-foreground">{time}</span> : null}
    </div>
  );
}

const SORT_OPTIONS: { key: CircleReplySort; labelKey: keyof WebAppCirclesCopy }[] = [
  { key: "new", labelKey: "replySortNew" },
  { key: "top", labelKey: "replySortTop" },
  { key: "helpful", labelKey: "replySortHelpful" },
];

export function WebCircleRepliesSection({
  replies,
  copy,
}: {
  replies: WebCircleReply[];
  copy: WebAppCirclesCopy;
}) {
  const [sort, setSort] = useState<CircleReplySort>("new");
  const sorted = useMemo(() => sortCircleReplies(replies, sort), [replies, sort]);

  if (replies.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-6 text-center text-sm text-muted-foreground backdrop-blur-sm">
        {copy.repliesEmpty}
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {copy.replySortLabel}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSort(opt.key)}
                className={[
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                  active
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-white/10 text-muted-foreground hover:border-white/20",
                ].join(" ")}
              >
                {copy[opt.labelKey]}
              </button>
            );
          })}
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {sorted.map((reply) => (
          <li key={reply.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
            <Byline
              author={reply.author}
              isAnonymous={reply.isAnonymous}
              time={relativeTime(reply.createdAt)}
              copy={copy}
            />
            {reply.body?.trim() ? (
              <p className="mt-2 text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
                {reply.body}
              </p>
            ) : null}
            <WebCircleReplyHelpful
              replyId={reply.id}
              initialCount={reply.helpfulCount}
              initialMarked={reply.viewerMarkedHelpful}
              copy={copy}
            />
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Heart className="size-3.5" aria-hidden />
                {reply.reactionCount}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
