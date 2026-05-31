"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Link2,
  Maximize2,
  MessageCircle,
  Minimize2,
  MoreHorizontal,
  Pause,
  Play,
  ShieldCheck,
  Share2,
  Sparkles,
  UserRound,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchPostCommentsAction } from "@/app/web-app/actions";
import type { WebAppRailCircle, WebAppRailCreator } from "./web-app-chrome";
import type { WebAppEngagementCopy, WebAppFeedCopy, WebAppShellCopy } from "@/lib/marketing-copy/web-app";
import type { WebFeedPost } from "@/lib/web-app/feed-data";
import { formatCount, relativeTime } from "@/lib/web-app/format";

import { FollowButton } from "./follow-button";
import { LikeButton } from "./like-button";
import { WebCommentsPanel, type WebCommentsState } from "./web-comments-panel";

const WHEEL_THRESHOLD = 36;
const WHEEL_COOLDOWN_MS = 480;
const SWIPE_THRESHOLD = 60;

/**
 * Premium desktop short-form video theater. Shows one vertical 9:16 post at a
 * time with keyboard / wheel / swipe navigation, a compact glass action rail,
 * clean video controls (play/pause, mute, progress, fullscreen), and a
 * contextual right rail that reacts to the active post. Non-video posts render
 * inside the same vertical frame; anonymous posts never expose identity.
 */
export function WebVideoTheater({
  posts,
  feedCopy,
  engagement,
  shellCopy,
  railCircles = [],
  railCreators = [],
  currentUserId = null,
  openAppHref,
  isExternalApp,
  guidelinesHref = "/community-guidelines",
  getAppHref = "/download",
}: {
  posts: WebFeedPost[];
  feedCopy: WebAppFeedCopy;
  engagement: WebAppEngagementCopy;
  shellCopy: WebAppShellCopy;
  railCircles?: WebAppRailCircle[];
  railCreators?: WebAppRailCreator[];
  currentUserId?: string | null;
  openAppHref: string;
  isExternalApp: boolean;
  guidelinesHref?: string;
  getAppHref?: string;
}) {
  const [index, setIndex] = useState(0);
  const [railOpen, setRailOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsState, setCommentsState] = useState<WebCommentsState>({ status: "loading" });
  const [commentsReloadKey, setCommentsReloadKey] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const wheelLock = useRef(0);
  const touchStartY = useRef<number | null>(null);

  const count = posts.length;
  const post = posts[Math.min(index, count - 1)];

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(count - 1, next));
      if (clamped === index) return;
      setIndex(clamped);
      setProgress(0);
      setMediaFailed(false);
      setCopied(false);
      // The panel follows the active post — show loading until the new
      // post's comments arrive (set here, not in the effect, to avoid a
      // synchronous cascading render).
      if (commentsOpen) setCommentsState({ status: "loading" });
    },
    [count, index, commentsOpen],
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  const openComments = useCallback(() => {
    setCommentsState({ status: "loading" });
    setCommentsOpen(true);
  }, []);

  const retryComments = useCallback(() => {
    setCommentsState({ status: "loading" });
    setCommentsReloadKey((k) => k + 1);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = playerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void el.requestFullscreen?.().catch(() => undefined);
    }
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
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, togglePlay, toggleFullscreen]);

  // Track fullscreen state.
  useEffect(() => {
    function onFs() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Keep the <video> element's muted state in sync with UI state.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, index]);

  // Load read-only comments on demand when the panel is open. Re-runs when the
  // active post changes (so the panel follows the current video) or on retry.
  // The "loading" reset happens in the open/navigate/retry handlers, so the
  // effect only performs the async fetch and resolves state in callbacks.
  useEffect(() => {
    if (!commentsOpen) return;
    const id = post?.id;
    if (!id) return;
    let cancelled = false;
    fetchPostCommentsAction(id)
      .then((res) => {
        if (cancelled) return;
        if (res.state === "ok") {
          setCommentsState({ status: "ok", comments: res.comments, total: res.total });
        } else {
          setCommentsState({ status: res.state === "unavailable" ? "unavailable" : "error" });
        }
      })
      .catch(() => {
        if (!cancelled) setCommentsState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [commentsOpen, post?.id, commentsReloadKey]);

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
  const captionSummary = post.caption?.trim() ? post.caption.trim() : null;
  // Follow is offered only for real, non-self, non-anonymous authors. Blocked
  // creators are already excluded from the feed by the ranker/exclusions.
  const canFollowAuthor =
    !post.isAnonymous && Boolean(post.author?.id) && post.author?.id !== currentUserId;

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

      {/* Body: video stage + contextual rail */}
      <div className="relative z-10 flex size-full">
        {/* Stage */}
        <div className="flex min-w-0 flex-1 items-center justify-center px-3 py-4 sm:px-6">
          <div className="relative flex h-full max-h-[82vh] min-h-0 items-stretch gap-3">
            {/* Vertical 9:16 player */}
            <div
              ref={playerRef}
              className="relative h-full aspect-[9/16] max-w-full overflow-hidden rounded-[26px] border border-white/12 bg-black shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(20,184,166,0.08)]"
            >
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
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2.5 px-3 pb-2">
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
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={feedCopy.fullscreenLabel}
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
                  >
                    {isFullscreen ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
                  </button>
                </div>
              ) : null}

              {/* Compact glass action rail (right edge of the video) */}
              <div className="absolute bottom-20 right-3 z-20 flex flex-col items-center gap-3">
                {railOpen ? (
                  <>
                    <LikeButton
                      key={post.id}
                      postId={post.id}
                      initialLiked={post.likedByViewer}
                      initialCount={post.likeCount}
                      labels={{ like: engagement.like, liked: engagement.liked, error: engagement.likeError }}
                      variant="rail"
                    />
                    <button
                      type="button"
                      onClick={openComments}
                      aria-label={feedCopy.commentsLabel}
                      className="flex flex-col items-center gap-1"
                    >
                      <span className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/15">
                        <MessageCircle className="size-5" aria-hidden />
                      </span>
                      <span className="text-[11px] font-semibold text-white/90">{formatCount(post.commentCount)}</span>
                    </button>
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
            </div>
          </div>
        </div>

        {/* Contextual right rail (reacts to the active post). Switches to the
            read-only comments panel when comments are opened. */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-white/8 bg-[rgba(8,14,28,0.5)] backdrop-blur-sm xl:flex">
          {commentsOpen ? (
            <WebCommentsPanel
              copy={feedCopy}
              state={commentsState}
              postId={post.id}
              captionSummary={captionSummary}
              fallbackCount={post.commentCount}
              currentUserId={currentUserId}
              onClose={() => setCommentsOpen(false)}
              onRetry={retryComments}
              onPosted={retryComments}
            />
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {/* Creator info */}
          <section className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.65)] p-4">
            <div className="flex items-center gap-3">
              <span className="size-11 shrink-0 rounded-full p-[2px] ring-2 ring-[var(--accent)]/60">
                {avatar}
              </span>
              <div className="min-w-0">
                {profileHref ? (
                  <Link href={profileHref} className="block truncate text-sm font-bold text-foreground hover:underline">
                    {authorName}
                  </Link>
                ) : (
                  <span className="block truncate text-sm font-bold text-foreground">{authorName}</span>
                )}
                <span className="block truncate text-xs text-muted-foreground">
                  {post.isAnonymous ? feedCopy.anonymousLabel : post.author?.username ? `@${post.author.username}` : time ?? ""}
                </span>
              </div>
            </div>
            {post.isAnonymous ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/8 p-2.5 text-[11px] leading-relaxed text-primary/90">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Identity stays hidden.
              </p>
            ) : profileHref ? (
              <div className="mt-3 flex flex-col gap-2">
                {canFollowAuthor && post.author?.id ? (
                  <FollowButton
                    key={post.author.id}
                    targetUserId={post.author.id}
                    initialFollowing={post.authorFollowedByViewer}
                    labels={{
                      follow: engagement.follow,
                      following: engagement.following,
                      error: engagement.followError,
                    }}
                    size="sm"
                    refreshOnSuccess={false}
                  />
                ) : null}
                <Link
                  href={profileHref}
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-foreground/90 transition hover:border-white/25"
                >
                  {shellCopy.accountProfile}
                </Link>
              </div>
            ) : null}
          </section>

          {/* Comments preview (read-only) */}
          <section className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.65)] p-4">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
              <MessageCircle className="size-3.5" aria-hidden />
              {feedCopy.commentsLabel}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatCount(post.commentCount)} {feedCopy.commentsLabel.toLowerCase()}
            </p>
            <button
              type="button"
              onClick={openComments}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-semibold text-foreground/90 transition hover:bg-white/15"
            >
              <MessageCircle className="size-3.5" aria-hidden />
              {feedCopy.viewCommentsLabel}
            </button>
          </section>

          {/* Trending circles */}
          {railCircles.length > 0 ? (
            <section className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.65)] p-4">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                <Users className="size-3.5" aria-hidden />
                {shellCopy.railCirclesTitle}
              </h2>
              <ul className="mt-3 space-y-0.5">
                {railCircles.map((circle) => (
                  <li key={circle.slug}>
                    <Link
                      href={`/web-app/circles/${encodeURIComponent(circle.slug)}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-primary/20 to-accent/10 text-lg">
                        {circle.icon ?? "💬"}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{circle.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {formatCount(circle.memberCount)} {shellCopy.membersLabel}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Suggested creators */}
          {railCreators.length > 0 ? (
            <section className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.65)] p-4">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                <Sparkles className="size-3.5" aria-hidden />
                {shellCopy.railCreatorsTitle}
              </h2>
              <ul className="mt-3 space-y-2">
                {railCreators.map((creator) => (
                  <li key={creator.id} className="flex items-center gap-2.5">
                    <Link
                      href={`/web-app/user/${creator.id}`}
                      className="flex min-w-0 flex-1 items-center gap-2.5"
                    >
                      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary/60 text-xs font-bold text-foreground/80">
                        {creator.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={creator.avatarUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <UserRound className="size-4 text-muted-foreground" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{creator.displayName}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {creator.specialty ?? (creator.username ? `@${creator.username}` : "")}
                        </span>
                      </span>
                    </Link>
                    <FollowButton
                      key={`${creator.id}:${creator.isFollowing}`}
                      targetUserId={creator.id}
                      initialFollowing={creator.isFollowing}
                      labels={{
                        follow: engagement.follow,
                        following: engagement.following,
                        error: engagement.followError,
                      }}
                      size="sm"
                      refreshOnSuccess={false}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Community safety */}
          <section className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.65)] p-4">
            <h3 className="text-sm font-semibold text-foreground">{shellCopy.railSafetyTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{shellCopy.railSafetyBody}</p>
            <Link
              href={guidelinesHref}
              className="mt-3 inline-block text-sm font-medium text-sky-300 underline decoration-sky-300/60 underline-offset-2 hover:text-sky-200"
            >
              {shellCopy.railSafetyLink}
            </Link>
          </section>

          {/* Get the app */}
          <section className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.65)] p-4">
            <h3 className="text-sm font-semibold text-foreground">{shellCopy.railGetAppTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{shellCopy.railGetAppBody}</p>
            <Link
              href={getAppHref}
              className="mt-3 inline-block text-sm font-medium text-sky-300 underline decoration-sky-300/60 underline-offset-2 hover:text-sky-200"
            >
              {shellCopy.railGetAppLink}
            </Link>
          </section>
            </div>
          )}
        </aside>
      </div>

      {/* Comments drawer (tablet / mobile) — below the xl rail breakpoint. */}
      {commentsOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end xl:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={feedCopy.commentsCloseLabel}
            onClick={() => setCommentsOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative max-h-[82vh] overflow-hidden rounded-t-3xl border-t border-white/12 bg-[rgba(8,14,28,0.96)] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)]">
            <WebCommentsPanel
              copy={feedCopy}
              state={commentsState}
              postId={post.id}
              captionSummary={captionSummary}
              fallbackCount={post.commentCount}
              currentUserId={currentUserId}
              onClose={() => setCommentsOpen(false)}
              onRetry={retryComments}
              onPosted={retryComments}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
