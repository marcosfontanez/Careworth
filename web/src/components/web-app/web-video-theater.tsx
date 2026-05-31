"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Share2,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { WebAppEngagementCopy, WebAppFeedCopy } from "@/lib/marketing-copy/web-app";
import type { WebFeedPost } from "@/lib/web-app/feed-data";
import { formatCount, relativeTime } from "@/lib/web-app/format";

import { LikeButton } from "./like-button";

const WHEEL_THRESHOLD = 36;
const WHEEL_COOLDOWN_MS = 480;
const SWIPE_THRESHOLD = 60;

/**
 * Premium desktop short-form video theater. Shows one vertical 9:16 post at a
 * time with keyboard / wheel / swipe navigation, a compact glass action rail,
 * and clean video controls. Non-video posts render inside the same vertical
 * frame; anonymous posts never expose identity.
 */
export function WebVideoTheater({
  posts,
  feedCopy,
  engagement,
  currentUserId = null,
  openAppHref,
  isExternalApp,
}: {
  posts: WebFeedPost[];
  feedCopy: WebAppFeedCopy;
  engagement: WebAppEngagementCopy;
  currentUserId?: string | null;
  openAppHref: string;
  isExternalApp: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [railOpen, setRailOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wheelLock = useRef(0);
  const touchStartY = useRef<number | null>(null);

  const count = posts.length;
  const post = posts[Math.min(index, count - 1)];

  const goTo = useCallback(
    (next: number) => {
      setIndex((cur) => {
        const clamped = Math.max(0, Math.min(count - 1, next));
        if (clamped !== cur) {
          setProgress(0);
          setMediaFailed(false);
          setCopied(false);
        }
        return clamped;
      });
    },
    [count],
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  }, []);

  // Keyboard navigation.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        goPrev();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === "m") {
        setMuted((m) => !m);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, togglePlay]);

  // Keep the <video> element's muted state in sync with UI state.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, index]);

  function onWheel(e: React.WheelEvent) {
    if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
    const now = Date.now();
    if (now < wheelLock.current) return;
    wheelLock.current = now + WHEEL_COOLDOWN_MS;
    if (e.deltaY > 0) goNext();
    else goPrev();
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartY.current;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientY ?? start;
    const dy = start - end;
    if (Math.abs(dy) >= SWIPE_THRESHOLD) {
      if (dy > 0) goNext();
      else goPrev();
    }
    touchStartY.current = null;
  }

  function onShare() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/post/${post.id}` : `/post/${post.id}`;
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(done);
    } else {
      done();
    }
  }

  if (!post) return null;

  const media = post.mediaUrl ?? post.thumbnailUrl;
  const poster = post.thumbnailUrl ?? undefined;
  const showVideo = post.isVideo && Boolean(post.mediaUrl) && !mediaFailed;
  const showImage = !showVideo && Boolean(media) && (!post.isVideo || mediaFailed);
  const isTextPost = !media;

  const authorName = post.isAnonymous ? feedCopy.anonymousLabel : post.author?.displayName ?? "PulseVerse member";
  const profileHref =
    !post.isAnonymous && post.author?.id
      ? post.author.id === currentUserId
        ? "/web-app/my-pulse"
        : `/web-app/user/${post.author.id}`
      : null;
  const time = relativeTime(post.createdAt);
  const externalProps = isExternalApp ? { target: "_blank", rel: "noreferrer" } : {};

  const avatar = (
    <span className="grid size-full place-items-center overflow-hidden rounded-full bg-secondary/60 text-xs font-bold text-white/80">
      {!post.isAnonymous && post.author?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.author.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <UserRound className="size-5 text-white/70" aria-hidden />
      )}
    </span>
  );

  return (
    <div
      className="relative size-full overflow-hidden"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Cinematic blurred backdrop */}
      <div aria-hidden className="absolute inset-0 bg-[#04070f]">
        {media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster ?? media}
            alt=""
            className="size-full scale-125 object-cover opacity-30 blur-3xl"
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_40%,rgba(20,184,166,0.10),transparent_60%),linear-gradient(180deg,rgba(2,6,15,0.55),rgba(2,6,15,0.92))]" />
      </div>

      {/* Stage */}
      <div className="relative z-10 flex size-full items-center justify-center px-3 py-4 sm:px-6">
        <div className="relative flex h-full max-h-[82vh] min-h-0 items-stretch gap-3">
          {/* Vertical 9:16 player */}
          <div className="relative h-full aspect-[9/16] max-w-full overflow-hidden rounded-[26px] border border-white/12 bg-black shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(20,184,166,0.08)]">
            {showVideo ? (
              <video
                key={post.id}
                ref={videoRef}
                src={post.mediaUrl ?? undefined}
                poster={poster}
                className="size-full bg-black object-cover"
                autoPlay
                muted={muted}
                loop
                playsInline
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration > 0) setProgress(v.currentTime / v.duration);
                }}
                onError={() => setMediaFailed(true)}
                onClick={togglePlay}
              />
            ) : showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media ?? ""} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#0c1530] via-[#0a1020] to-[#0c1024] p-7 text-center">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                  {post.isAnonymous ? feedCopy.anonymousLabel : feedCopy.textPostLabel}
                </span>
                <p className="max-w-[18rem] text-lg font-medium leading-relaxed text-white/90 [overflow-wrap:anywhere]">
                  {post.caption?.trim()
                    ? post.caption.length > 300
                      ? `${post.caption.slice(0, 300)}…`
                      : post.caption
                    : "—"}
                </p>
              </div>
            )}

            {/* Top gradient + index counter */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/55 to-transparent p-3">
              <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
                {index + 1} / {count}
              </span>
              {post.isVideo ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
                  <Play className="size-3 fill-current" aria-hidden />
                  {feedCopy.videoBadge}
                </span>
              ) : null}
            </div>

            {/* Bottom-left creator + caption overlay */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4 pr-16">
              <div className="pointer-events-auto flex items-center gap-2.5">
                <span className="size-9 shrink-0 rounded-full p-[2px] ring-2 ring-[var(--accent)]/70">
                  {profileHref ? (
                    <Link href={profileHref} className="block size-full">
                      {avatar}
                    </Link>
                  ) : (
                    avatar
                  )}
                </span>
                <div className="min-w-0">
                  {profileHref ? (
                    <Link href={profileHref} className="block truncate text-sm font-bold text-white hover:underline">
                      {authorName}
                    </Link>
                  ) : (
                    <span className="block truncate text-sm font-bold text-white">{authorName}</span>
                  )}
                  <span className="block truncate text-xs text-white/65">
                    {post.isAnonymous
                      ? "Confession"
                      : post.author?.username
                        ? `@${post.author.username}`
                        : time ?? ""}
                  </span>
                </div>
              </div>
              {post.caption?.trim() && !isTextPost ? (
                <p className="pointer-events-auto mt-2.5 line-clamp-2 max-w-[22rem] text-sm leading-relaxed text-white/90 [overflow-wrap:anywhere]">
                  {post.caption}
                </p>
              ) : null}
            </div>

            {/* Video controls */}
            {showVideo ? (
              <div className="absolute inset-x-0 bottom-0 z-10 flex translate-y-0 items-center gap-2.5 px-3 pb-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={playing ? feedCopy.pauseLabel : feedCopy.playLabel}
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
                >
                  {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4 fill-current" aria-hidden />}
                </button>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-300 to-sky-400"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? feedCopy.soundOnLabel : feedCopy.soundOffLabel}
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
                >
                  {muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
                </button>
              </div>
            ) : null}

            {/* Compact glass action rail (right edge of the video) */}
            <div className="absolute bottom-20 right-3 z-20 flex flex-col items-center gap-3">
              {railOpen ? (
                <>
                  <LikeButton
                    postId={post.id}
                    initialLiked={post.likedByViewer}
                    initialCount={post.likeCount}
                    labels={{ like: engagement.like, liked: engagement.liked, error: engagement.likeError }}
                    variant="rail"
                  />
                  <Link
                    href={`/post/${post.id}`}
                    aria-label={feedCopy.commentsLabel}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/15">
                      <MessageCircle className="size-5" aria-hidden />
                    </span>
                    <span className="text-[11px] font-semibold text-white/90">{formatCount(post.commentCount)}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={onShare}
                    aria-label={feedCopy.shareLabel}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/15">
                      {copied ? <Link2 className="size-5 text-teal-300" aria-hidden /> : <Share2 className="size-5" aria-hidden />}
                    </span>
                    <span className="text-[11px] font-semibold text-white/90">
                      {copied ? feedCopy.copiedLabel : feedCopy.shareLabel}
                    </span>
                  </button>
                  <a
                    href={openAppHref}
                    {...externalProps}
                    aria-label={feedCopy.moreLabel}
                    className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/15"
                  >
                    <MoreHorizontal className="size-5" aria-hidden />
                  </a>
                  <button
                    type="button"
                    onClick={() => setRailOpen(false)}
                    aria-label="Collapse"
                    className="grid size-8 place-items-center rounded-full border border-white/12 bg-black/40 text-white/80 backdrop-blur-md transition hover:text-white"
                  >
                    <ChevronDown className="size-4" aria-hidden />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setRailOpen(true)}
                  aria-label={feedCopy.moreLabel}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span className="size-12 rounded-full p-[2px] ring-2 ring-[var(--accent)]/70 backdrop-blur-md">
                    {avatar}
                  </span>
                  <span className="grid size-7 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20">
                    <ChevronUp className="size-4" aria-hidden />
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Prev / next controls (desktop) */}
          <div className="hidden flex-col justify-center gap-3 sm:flex">
            <button
              type="button"
              onClick={goPrev}
              disabled={index === 0}
              aria-label={feedCopy.prevLabel}
              className="grid size-11 place-items-center rounded-full border border-white/12 bg-white/8 text-white backdrop-blur-md transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronUp className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={index >= count - 1}
              aria-label={feedCopy.nextLabel}
              className="grid size-11 place-items-center rounded-full border border-white/12 bg-white/8 text-white backdrop-blur-md transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronDown className="size-5" aria-hidden />
            </button>
            <a
              href={openAppHref}
              {...externalProps}
              aria-label={feedCopy.openInApp}
              title={feedCopy.openInApp}
              className="mt-1 grid size-11 place-items-center rounded-full border border-white/12 bg-white/8 text-white/80 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
            >
              <ExternalLink className="size-5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
