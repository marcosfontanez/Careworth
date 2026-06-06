"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  MessageCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  togglePostLikeAction,
  toggleProfileUpdateLikeAction,
} from "@/app/web-app/actions";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatCount } from "@/lib/web-app/format";
import { cn } from "@/lib/utils";
import type {
  WebPulsePhotoViewerCreator,
  WebPulsePhotoViewerItem,
} from "@/lib/web-app/pulse-photo-gallery";

type EngagementLabels = {
  like: string;
  liked: string;
  pulse: string;
  pulsed: string;
  likeError: string;
};

type Session = {
  items: WebPulsePhotoViewerItem[];
  initialIndex: number;
  creator: WebPulsePhotoViewerCreator;
  engagement?: EngagementLabels;
};

const DEFAULT_ENGAGEMENT: EngagementLabels = {
  like: "Like",
  liked: "Liked",
  pulse: "Pulse",
  pulsed: "Pulsed",
  likeError: "Couldn’t update like.",
};

const SWIPE_MIN_PX = 48;
const DISMISS_MIN_PX = 56;
const SWIPE_MAX_MS = 450;

export function WebPulsePhotoViewerHost({
  session,
  onClose,
}: {
  session: Session | null;
  onClose: () => void;
}) {
  if (!session?.items.length) return null;
  return (
    <WebPulsePhotoViewerDialog
      open
      items={session.items}
      initialIndex={session.initialIndex}
      creator={session.creator}
      engagement={session.engagement ?? DEFAULT_ENGAGEMENT}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    />
  );
}

function resolveSourceHref(item: WebPulsePhotoViewerItem | undefined): string | null {
  if (!item) return null;
  if (item.sourcePostId) return `/web-app/post/${item.sourcePostId}`;
  if (item.pulseUpdateId) return `/web-app/my-pulse/update/${item.pulseUpdateId}`;
  return null;
}

function applyWebLikeToItems(
  prev: WebPulsePhotoViewerItem[],
  targetKind: "post" | "pulse-update",
  targetId: string,
  nextLiked: boolean,
): WebPulsePhotoViewerItem[] {
  const delta = nextLiked ? 1 : -1;
  return prev.map((item) => {
    if (item.likeTarget !== targetKind || item.likeTargetId !== targetId) return item;
    return {
      ...item,
      liked: nextLiked,
      likeCount: Math.max(0, (item.likeCount ?? 0) + delta),
    };
  });
}

function WebPulsePhotoViewerDialog({
  open,
  items,
  initialIndex = 0,
  creator,
  engagement,
  onOpenChange,
}: {
  open: boolean;
  items: WebPulsePhotoViewerItem[];
  initialIndex?: number;
  creator: WebPulsePhotoViewerCreator;
  engagement: EngagementLabels;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const safeInitial = Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1));
  const [index, setIndex] = useState(safeInitial);
  const [itemStates, setItemStates] = useState(items);
  const [loaded, setLoaded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [likeErrored, setLikeErrored] = useState(false);
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setIndex(safeInitial);
    setItemStates(items);
    setLoaded(false);
    setDragY(0);
    setLikeErrored(false);
  }, [open, safeInitial, items]);

  const current = itemStates[index];
  const showLike = Boolean(current?.likeTarget && current.likeTargetId);
  const liked = current?.liked === true;
  const likeCount = current?.likeCount ?? 0;
  const isPulseTarget = current?.likeTarget === "pulse-update";

  const onToggleLike = useCallback(() => {
    const targetKind = current?.likeTarget;
    const targetId = current?.likeTargetId;
    if (!targetKind || !targetId || pending) return;
    setLikeErrored(false);
    const nextLiked = !liked;
    setItemStates((prev) => applyWebLikeToItems(prev, targetKind, targetId, nextLiked));

    startTransition(async () => {
      const res =
        targetKind === "post"
          ? await togglePostLikeAction(targetId)
          : await toggleProfileUpdateLikeAction(targetId);
      if (!res.ok) {
        setItemStates((prev) => applyWebLikeToItems(prev, targetKind, targetId, !nextLiked));
        if (res.reason === "auth") {
          router.push(`/login?next=${encodeURIComponent(pathname ?? "/web-app/feed")}`);
          return;
        }
        setLikeErrored(true);
        return;
      }
      setItemStates((prev) => applyWebLikeToItems(prev, targetKind, targetId, res.active));
    });
  }, [current?.likeTarget, current?.likeTargetId, liked, pathname, pending, router]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    setLoaded(false);
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(itemStates.length - 1, i + 1));
    setLoaded(false);
  }, [itemStates.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext, onOpenChange]);

  useEffect(() => {
    if (!open || itemStates.length < 2) return;
    const preload = (i: number) => {
      const url = itemStates[i]?.imageUrl?.trim();
      if (!url) return;
      const img = new window.Image();
      img.src = url;
    };
    preload(index + 1);
    preload(index - 1);
  }, [open, index, itemStates]);

  const sourceHref = useMemo(() => resolveSourceHref(current), [current]);
  const viewPostLabel = current?.pulseUpdateId && !current.sourcePostId ? "View update" : "View post";

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    setDragY(0);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const start = touchRef.current;
    const t = e.touches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const horizontal = Math.abs(dx) > Math.abs(dy) * 1.1;
    const vertical = Math.abs(dy) > Math.abs(dx) * 1.1;

    if (horizontal && itemStates.length > 1 && Math.abs(dx) > 12) {
      e.preventDefault();
      setDragY(0);
      return;
    }
    if (vertical && Math.abs(dy) > 8) {
      e.preventDefault();
      setDragY(dy);
    }
  }, [itemStates.length]);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchRef.current;
      touchRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const elapsed = Date.now() - start.t;
      setDragY(0);

      if (elapsed > SWIPE_MAX_MS) return;

      if (Math.abs(dy) >= DISMISS_MIN_PX && Math.abs(dy) > Math.abs(dx) * 1.2) {
        onOpenChange(false);
        return;
      }

      if (itemStates.length < 2) return;
      if (Math.abs(dx) < SWIPE_MIN_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.25) return;
      if (dx < 0) goNext();
      else goPrev();
    },
    [goNext, goPrev, itemStates.length, onOpenChange],
  );

  const dragOpacity =
    dragY === 0 ? 1 : Math.max(0.35, 1 - Math.min(Math.abs(dragY) / 320, 0.65));

  const countLabel = itemStates.length > 1 ? `${index + 1} of ${itemStates.length}` : null;
  const likeLabel = isPulseTarget
    ? liked
      ? engagement.pulsed
      : engagement.pulse
    : liked
      ? engagement.liked
      : engagement.like;
  const headerTitle = current?.isAnonymous ? "Anonymous post" : creator.displayName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        backdropClassName="bg-black/82 supports-backdrop-filter:backdrop-blur-sm"
        className={cn(
          "flex h-dvh max-h-dvh w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-white/10 bg-[rgba(4,8,18,0.98)] p-0 transition-transform duration-200",
          "sm:max-w-none",
        )}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          opacity: dragOpacity,
        }}
      >
        <DialogTitle className="sr-only">Photo viewer</DialogTitle>

        <header className="relative z-10 border-b border-white/8 bg-[rgba(6,14,26,0.88)] px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            {!current?.isAnonymous && creator.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatarUrl}
                alt=""
                className="size-9 rounded-full border border-white/15 object-cover"
              />
            ) : (
              <span className="grid size-9 place-items-center rounded-full border border-teal-400/35 bg-[rgba(15,23,42,0.88)] text-teal-300">
                {current?.isAnonymous ? "?" : creator.displayName.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{headerTitle}</p>
              <p className="truncate text-xs font-semibold text-slate-400">
                {current?.sourceLabel}
                {countLabel ? ` · ${countLabel}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="grid size-10 place-items-center rounded-full border border-white/15 bg-black/45 text-white transition hover:border-teal-400/40"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {current?.caption ? (
            <p className="mx-auto mt-2 max-w-5xl truncate text-sm font-medium text-slate-200">
              {current.caption}
            </p>
          ) : null}
        </header>

        <div
          className="relative flex min-h-0 flex-1 touch-none items-center justify-center px-3 py-4 sm:px-10"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {!loaded ? (
            <div
              aria-hidden
              className="absolute inset-0 grid place-items-center bg-[rgba(8,12,24,0.55)]"
            >
              <div className="size-10 animate-pulse rounded-full border-2 border-teal-400/35 border-t-teal-300" />
            </div>
          ) : null}
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.id}
              src={current.imageUrl}
              alt={current.caption ?? "Photo"}
              onLoad={() => setLoaded(true)}
              className={cn(
                "max-h-[calc(100dvh-220px)] max-w-full select-none object-contain transition-opacity duration-300",
                loaded ? "opacity-100" : "opacity-0",
              )}
              draggable={false}
            />
          ) : null}

          {itemStates.length > 1 && index > 0 ? (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-sm transition hover:border-teal-400/40 sm:left-3"
              aria-label="Previous photo"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
          ) : null}
          {itemStates.length > 1 && index < itemStates.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-sm transition hover:border-teal-400/40 sm:right-3"
              aria-label="Next photo"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          ) : null}

          {showLike ? (
            <div className="absolute bottom-6 right-3 z-10 flex flex-col items-center gap-1.5 sm:right-4">
              <button
                type="button"
                onClick={onToggleLike}
                disabled={pending}
                aria-pressed={liked}
                aria-label={likeLabel}
                title={likeErrored ? engagement.likeError : likeLabel}
                className={cn(
                  "grid size-[52px] place-items-center rounded-full border backdrop-blur-md transition active:scale-95 disabled:opacity-60",
                  liked
                    ? "border-rose-400/50 bg-rose-500/25 text-rose-300 shadow-[0_0_18px_-4px_rgba(244,63,94,0.8)]"
                    : "border-white/15 bg-black/55 text-white hover:border-teal-400/40",
                  likeErrored ? "border-amber-400/60" : "",
                )}
              >
                <Heart className={cn("size-6", liked ? "fill-current" : "")} aria-hidden />
              </button>
              {likeCount > 0 ? (
                <span className="text-[11px] font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                  {formatCount(likeCount)}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="border-t border-white/8 bg-[rgba(6,14,26,0.92)] px-4 py-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2">
            {showLike ? (
              <button
                type="button"
                onClick={onToggleLike}
                disabled={pending}
                aria-pressed={liked}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition disabled:opacity-60",
                  liked
                    ? "border-rose-400/45 bg-rose-500/15 text-rose-200"
                    : "border-teal-400/35 bg-[rgba(12,18,32,0.82)] text-teal-100 hover:border-teal-300/55",
                )}
              >
                <Heart className={cn("size-4", liked ? "fill-current" : "")} aria-hidden />
                {likeLabel}
                {likeCount > 0 ? ` · ${formatCount(likeCount)}` : ""}
              </button>
            ) : null}
            {current?.showViewPost && sourceHref ? (
              <Link
                href={sourceHref}
                className="inline-flex items-center gap-2 rounded-full border border-teal-400/35 bg-[rgba(12,18,32,0.82)] px-4 py-2.5 text-xs font-bold text-teal-100 transition hover:border-teal-300/55"
              >
                <ExternalLink className="size-4" aria-hidden />
                {viewPostLabel}
              </Link>
            ) : null}
            {current?.showComment && sourceHref ? (
              <Link
                href={`${sourceHref}?focus=comments`}
                className="inline-flex items-center gap-2 rounded-full border border-teal-400/35 bg-[rgba(12,18,32,0.82)] px-4 py-2.5 text-xs font-bold text-teal-100 transition hover:border-teal-300/55"
              >
                <MessageCircle className="size-4" aria-hidden />
                Comment
                {typeof current.commentCount === "number" && current.commentCount > 0
                  ? ` · ${current.commentCount}`
                  : ""}
              </Link>
            ) : null}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
