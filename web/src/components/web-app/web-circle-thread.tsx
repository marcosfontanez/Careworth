import Link from "next/link";
import { ArrowLeft, ExternalLink, Heart, MessageCircle, Play, ShieldCheck, UserRound } from "lucide-react";

import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";
import type { WebCircle, WebCircleAuthor, WebCircleReply, WebCircleThread } from "@/lib/web-app/circles-data";
import { formatCount, relativeTime } from "@/lib/web-app/format";

import { WebCircleReplyComposer } from "./web-circle-reply-composer";

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

function ReplyItem({ reply, copy }: { reply: WebCircleReply; copy: WebAppCirclesCopy }) {
  return (
    <li className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
      <Byline author={reply.author} isAnonymous={reply.isAnonymous} time={relativeTime(reply.createdAt)} copy={copy} />
      {reply.body?.trim() ? (
        <p className="mt-2 text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">{reply.body}</p>
      ) : null}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Heart className="size-3.5" aria-hidden />
          {formatCount(reply.reactionCount)}
        </span>
      </div>
    </li>
  );
}

export function WebCircleThreadView({
  circle,
  isConfession,
  thread,
  replies,
  copy,
  openAppHref,
  isExternalApp,
}: {
  circle: WebCircle;
  isConfession: boolean;
  thread: WebCircleThread;
  replies: WebCircleReply[];
  copy: WebAppCirclesCopy;
  openAppHref: string;
  isExternalApp: boolean;
}) {
  const externalProps = isExternalApp ? { target: "_blank", rel: "noreferrer" } : {};

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={`/web-app/circles/${encodeURIComponent(circle.slug)}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {circle.name}
      </Link>

      {/* Thread */}
      <article className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.86)] p-5 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-6">
        <Byline author={thread.author} isAnonymous={thread.isAnonymous} time={relativeTime(thread.createdAt)} copy={copy} />

        {thread.title?.trim() ? (
          <h1 className="mt-3 font-heading text-xl font-bold tracking-tight text-foreground [overflow-wrap:anywhere]">
            {thread.title}
          </h1>
        ) : null}
        {thread.body?.trim() ? (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
            {thread.body}
          </p>
        ) : null}

        {thread.mediaThumbUrl ? (
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl bg-[#05080f]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thread.mediaThumbUrl} alt="" className="size-full object-cover" />
            {thread.isVideo ? (
              <span className="pointer-events-none absolute inset-0 grid place-items-center">
                <span className="grid size-14 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                  <Play className="size-6 fill-current" aria-hidden />
                </span>
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-4 border-t border-white/8 pt-3.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Heart className="size-4" aria-hidden />
            {formatCount(thread.reactionCount)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="size-4" aria-hidden />
            {formatCount(thread.replyCount)}
          </span>
          <a
            href={openAppHref}
            {...externalProps}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-1.5 text-xs font-semibold text-foreground/90 transition hover:border-white/25"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {copy.replyInApp}
          </a>
        </div>
      </article>

      {isConfession ? (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/8 p-3 text-xs leading-relaxed text-primary/90">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {copy.confessionNote}
        </p>
      ) : null}

      {/* Replies */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {copy.repliesTitle}
        </h2>

        {/* Text-only reply composer (signed-in; route is auth-gated) */}
        <WebCircleReplyComposer slug={circle.slug} threadId={thread.id} copy={copy} />

        <div className="mt-5">
        {replies.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-6 text-center text-sm text-muted-foreground backdrop-blur-sm">
            {copy.repliesEmpty}
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {replies.map((reply) => (
              <ReplyItem key={reply.id} reply={reply} copy={copy} />
            ))}
          </ul>
        )}
        </div>
      </section>
    </div>
  );
}
