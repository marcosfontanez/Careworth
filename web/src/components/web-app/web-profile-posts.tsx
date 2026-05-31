"use client";

import Link from "next/link";
import { Heart, ImageOff, LayoutGrid, List, MessageCircle, Play } from "lucide-react";
import { useState } from "react";

import type { WebAppEngagementCopy, WebAppProfileCopy } from "@/lib/marketing-copy/web-app";
import type { WebProfilePost } from "@/lib/web-app/profile-data";
import { cn } from "@/lib/utils";
import { formatCount, relativeTime } from "@/lib/web-app/format";

import { LikeButton } from "./like-button";

function GridTile({
  post,
  copy,
  engagement,
}: {
  post: WebProfilePost;
  copy: WebAppProfileCopy;
  engagement: WebAppEngagementCopy;
}) {
  const media = post.thumbnailUrl ?? post.mediaUrl;
  return (
    <div className="group relative aspect-9/16 overflow-hidden rounded-2xl border border-white/10 bg-[#05080f] shadow-[0_18px_50px_-34px_rgba(0,0,0,0.95)] transition hover:border-teal-300/30">
      {media ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.05]"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between bg-linear-to-br from-[#101a35] to-[#0a1020] p-3">
          <ImageOff className="size-4 text-muted-foreground/60" aria-hidden />
          <p className="line-clamp-4 text-xs leading-snug text-foreground/85 wrap-anywhere">
            {post.caption?.trim() || "—"}
          </p>
        </div>
      )}

      {/* Whole-tile navigation → native web post page (sits beneath controls). */}
      <Link href={`/web-app/post/${post.id}`} className="absolute inset-0 z-10" aria-label={copy.openPost} />

      {/* Bottom caption + play affordance */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/85 via-black/30 to-transparent px-2.5 pb-2 pt-7">
        {post.caption?.trim() ? (
          <p className="line-clamp-2 text-[11px] font-semibold uppercase leading-snug tracking-wide text-white/90 wrap-anywhere">
            {post.caption}
          </p>
        ) : null}
        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-white/85">
          {post.isVideo ? <Play className="size-3 fill-current" aria-hidden /> : null}
        </div>
      </div>

      {/* Interactive like — above the navigation overlay (mockup: bottom-right). */}
      <span className="absolute bottom-1.5 right-2 z-20 inline-flex rounded-full bg-black/55 px-2 py-1 text-white backdrop-blur-sm">
        <LikeButton
          postId={post.id}
          initialLiked={post.likedByViewer}
          initialCount={post.likeCount}
          labels={{ like: engagement.like, liked: engagement.liked, error: engagement.likeError }}
          size="sm"
        />
      </span>
    </div>
  );
}

function ListRow({ post, copy }: { post: WebProfilePost; copy: WebAppProfileCopy }) {
  const media = post.thumbnailUrl ?? post.mediaUrl;
  const time = relativeTime(post.createdAt);
  return (
    <div className="group relative flex items-center gap-3.5 rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-2.5 backdrop-blur-sm transition hover:border-teal-300/30 hover:bg-[rgba(18,26,44,0.9)]">
      <Link href={`/web-app/post/${post.id}`} className="absolute inset-0 z-10" aria-label={copy.openPost} />
      <span className="relative grid aspect-square w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#05080f]">
        {media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <ImageOff className="size-4 text-muted-foreground/60" aria-hidden />
        )}
        {post.isVideo ? (
          <span className="absolute bottom-1 left-1 inline-flex rounded-full bg-black/55 p-1 text-white">
            <Play className="size-2.5 fill-current" aria-hidden />
          </span>
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground wrap-anywhere">
          {post.caption?.trim() || copy.videoBadge}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3.5" aria-hidden />
            {formatCount(post.likeCount)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3.5" aria-hidden />
            {formatCount(post.commentCount)}
          </span>
          {time ? <span className="ml-auto">{time}</span> : null}
        </div>
      </div>
    </div>
  );
}

export function WebProfilePosts({
  posts,
  copy,
  engagement,
  isOwner,
}: {
  posts: WebProfilePost[];
  copy: WebAppProfileCopy;
  engagement: WebAppEngagementCopy;
  isOwner: boolean;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-foreground">
          {copy.postsTitle}
        </h2>
        {posts.length > 0 ? (
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label={copy.gridView}
              aria-pressed={view === "grid"}
              className={cn(
                "grid size-7 place-items-center rounded-full transition",
                view === "grid"
                  ? "bg-linear-to-r from-teal-400 to-sky-500 text-[#04121f]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label={copy.listView}
              aria-pressed={view === "list"}
              className={cn(
                "grid size-7 place-items-center rounded-full transition",
                view === "list"
                  ? "bg-linear-to-r from-teal-400 to-sky-500 text-[#04121f]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-8 text-center text-sm text-muted-foreground backdrop-blur-sm">
          {isOwner ? copy.postsEmptyOwner : copy.postsEmptyVisitor}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {posts.map((post) => (
            <GridTile key={post.id} post={post} copy={copy} engagement={engagement} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {posts.map((post) => (
            <ListRow key={post.id} post={post} copy={copy} />
          ))}
        </div>
      )}
    </section>
  );
}
