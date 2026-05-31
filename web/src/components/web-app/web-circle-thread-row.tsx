import Link from "next/link";
import { Heart, MessageCircle, Play, UserRound } from "lucide-react";

import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";
import type { WebCircleThread } from "@/lib/web-app/circles-data";
import { formatCount, relativeTime } from "@/lib/web-app/format";

export function WebCircleThreadRow({
  slug,
  thread,
  copy,
}: {
  slug: string;
  thread: WebCircleThread;
  copy: WebAppCirclesCopy;
}) {
  const time = relativeTime(thread.createdAt);
  const author = thread.author;
  const showAvatar = !thread.isAnonymous && author?.avatarUrl;
  const teaser = thread.body?.trim() ?? "";

  return (
    <Link
      href={`/web-app/circles/${encodeURIComponent(slug)}/thread/${thread.id}`}
      className="group flex flex-col rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.82)] p-4 shadow-[0_20px_60px_-44px_rgba(0,0,0,0.9)] backdrop-blur-sm transition hover:border-primary/25 hover:bg-[rgba(18,26,44,0.9)]"
    >
      {/* Byline */}
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary/60">
          {showAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author!.avatarUrl!} alt="" className="size-full object-cover" />
          ) : (
            <UserRound className="size-3.5 text-muted-foreground" aria-hidden />
          )}
        </span>
        <span className="truncate text-xs font-medium text-foreground/90">
          {thread.isAnonymous ? copy.anonymousLabel : author?.displayName ?? copy.anonymousLabel}
        </span>
        {thread.kind ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {thread.kind}
          </span>
        ) : null}
        {time ? <span className="ml-auto shrink-0 text-xs text-muted-foreground">{time}</span> : null}
      </div>

      {thread.title?.trim() ? (
        <h3 className="mt-2.5 font-heading text-base font-semibold tracking-tight text-foreground [overflow-wrap:anywhere]">
          {thread.title}
        </h3>
      ) : null}
      {teaser ? (
        <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          {teaser}
        </p>
      ) : null}

      {thread.mediaThumbUrl ? (
        <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-2xl bg-[#05080f]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thread.mediaThumbUrl} alt="" loading="lazy" className="size-full object-cover" />
          {thread.isVideo ? (
            <span className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid size-12 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                <Play className="size-5 fill-current" aria-hidden />
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Heart className="size-3.5" aria-hidden />
          {formatCount(thread.reactionCount)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="size-3.5" aria-hidden />
          {formatCount(thread.replyCount)}
        </span>
        <span className="ml-auto text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">
          {copy.openThread}
        </span>
      </div>
    </Link>
  );
}
