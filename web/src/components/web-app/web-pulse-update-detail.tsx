"use client";

import Link from "next/link";
import { ArrowLeft, Expand, MessageCircle, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { WebAppEngagementCopy, WebAppProfileCopy } from "@/lib/marketing-copy/web-app";
import {
  buildWebPulseUpdateDetailGallery,
  type WebPulsePhotoViewerCreator,
} from "@/lib/web-app/pulse-photo-gallery";
import type { WebPulseUpdateComment, WebPulseUpdateDetail } from "@/lib/web-app/pulse-update-types";
import { resolveWebPicsUrls } from "@/lib/web-app/pulse-update-utils";
import { formatCount, relativeTime } from "@/lib/web-app/format";
import { WebPulsePhotoViewerHost } from "./web-pulse-photo-viewer";

export function WebPulseUpdateDetail({
  update,
  comments,
  copy,
  engagement,
  backHref,
  focusComments = false,
}: {
  update: WebPulseUpdateDetail;
  comments: WebPulseUpdateComment[];
  copy: WebAppProfileCopy;
  engagement: WebAppEngagementCopy;
  backHref: string;
  focusComments?: boolean;
}) {
  const pics = resolveWebPicsUrls(update);
  const creator: WebPulsePhotoViewerCreator = {
    id: update.author?.id ?? update.userId,
    displayName: update.author?.displayName ?? "PulseVerse member",
    avatarUrl: update.author?.avatarUrl,
  };
  const gallery = useMemo(() => buildWebPulseUpdateDetailGallery(update), [update]);
  const [viewerSession, setViewerSession] = useState<{ initialIndex: number } | null>(null);

  useEffect(() => {
    if (!focusComments) return;
    const el = document.getElementById("pulse-update-comments");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusComments]);

  const body = update.content?.trim() || update.previewText?.trim() || "";
  const profileHref =
    update.author?.id && update.userId
      ? update.userId === update.author.id
        ? `/web-app/user/${update.userId}`
        : `/web-app/user/${update.userId}`
      : backHref;

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {copy.goToFeed}
      </Link>

      <article className="overflow-hidden rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.86)] shadow-[0_24px_70px_-36px_rgba(0,0,0,0.9)] backdrop-blur-sm">
        <div className="border-b border-white/8 px-4 py-4 sm:px-5">
          {update.author ? (
            <Link
              href={profileHref ?? backHref}
              className="flex items-center gap-3 transition hover:opacity-90"
            >
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary/60">
                {update.author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={update.author.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  <UserRound className="size-4 text-muted-foreground" aria-hidden />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {update.author.displayName}
                </span>
                {update.author.username ? (
                  <span className="block truncate text-xs text-muted-foreground">@{update.author.username}</span>
                ) : null}
              </span>
            </Link>
          ) : null}
          {update.mood ? (
            <p className="mt-3 inline-flex rounded-full border border-violet-300/30 bg-violet-400/10 px-2.5 py-1 text-xs font-semibold text-violet-200">
              {update.mood}
            </p>
          ) : null}
          {body ? <p className="mt-3 text-sm leading-relaxed text-foreground/90 wrap-anywhere">{body}</p> : null}
        </div>

        {pics.length > 0 ? (
          <div className="grid grid-cols-2 gap-1 bg-black/20 p-1 sm:grid-cols-3">
            {pics.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => setViewerSession({ initialIndex: index })}
                className="group relative aspect-square overflow-hidden bg-[#05080f]"
                aria-label={`View photo ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="size-full object-contain transition group-hover:scale-[1.02]" />
                <span className="pointer-events-none absolute right-2 top-2 grid size-7 place-items-center rounded-full border border-teal-400/35 bg-black/55 text-teal-200 opacity-0 transition group-hover:opacity-100">
                  <Expand className="size-3.5" aria-hidden />
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-4 border-b border-white/8 px-4 py-3 text-xs text-muted-foreground sm:px-5">
          <span>{formatCount(update.likeCount)} pulses</span>
          <span>{formatCount(update.commentCount)} comments</span>
          {update.createdAt ? <span>{relativeTime(update.createdAt)}</span> : null}
        </div>

        <section id="pulse-update-comments" className="px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="size-4 text-teal-300" aria-hidden />
            <h2 className="text-sm font-bold text-foreground">Comments</h2>
          </div>
          {comments.length === 0 ? (
            <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-muted-foreground">
              No comments yet.
            </p>
          ) : (
            <ul className="grid gap-3">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] p-3.5"
                >
                  <div className="mb-1 flex items-center gap-2">
                    {comment.author?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.author.avatarUrl}
                        alt=""
                        className="size-7 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid size-7 place-items-center rounded-full bg-secondary/60">
                        <UserRound className="size-3.5 text-muted-foreground" aria-hidden />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-foreground">
                        {comment.author?.displayName ?? "Member"}
                      </span>
                      {comment.createdAt ? (
                        <span className="text-[11px] text-muted-foreground">{relativeTime(comment.createdAt)}</span>
                      ) : null}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90 wrap-anywhere">{comment.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>

      <WebPulsePhotoViewerHost
        session={
          viewerSession
            ? {
                items: gallery,
                initialIndex: viewerSession.initialIndex,
                creator,
                engagement: {
                  like: engagement.like,
                  liked: engagement.liked,
                  likeError: engagement.likeError,
                  pulse: "Pulse",
                  pulsed: "Pulsed",
                },
              }
            : null
        }
        onClose={() => setViewerSession(null)}
      />
    </div>
  );
}
