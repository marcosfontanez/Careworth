"use client";

import {
  ChevronRight,
  Expand,
  Heart,
  Images,
  MessageCircle,
  Moon,
  Pin,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import type { WebAppProfileCopy } from "@/lib/marketing-copy/web-app";
import type { WebProfileHeader, WebPulseUpdate } from "@/lib/web-app/profile-data";
import {
  buildWebPulseUpdatePhotoGallery,
  type WebPulsePhotoViewerCreator,
} from "@/lib/web-app/pulse-photo-gallery";
import { isWebPulsePicsUpdate, resolveWebPicsUrls } from "@/lib/web-app/pulse-update-data";
import { formatCount, relativeTime } from "@/lib/web-app/format";
import { WebPulsePhotoViewerHost } from "./web-pulse-photo-viewer";

function updateVisual(type: string): { Icon: LucideIcon; tile: string } {
  const t = type.toLowerCase();
  if (/(milestone|achiev|badge|reward|level)/.test(t))
    return { Icon: Trophy, tile: "border-amber-300/30 bg-amber-400/10 text-amber-300" };
  if (/(streak|consist|daily)/.test(t))
    return { Icon: ShieldCheck, tile: "border-teal-300/30 bg-teal-400/10 text-teal-300" };
  if (/(reflect|mood|journal|shift)/.test(t))
    return { Icon: Moon, tile: "border-violet-300/30 bg-violet-400/10 text-violet-300" };
  if (/(question|community|answer|reply)/.test(t))
    return { Icon: Users, tile: "border-sky-300/30 bg-sky-400/10 text-sky-300" };
  if (/(pic|photo|image)/.test(t))
    return { Icon: Images, tile: "border-amber-300/30 bg-amber-400/10 text-amber-300" };
  return { Icon: Sparkles, tile: "border-primary/30 bg-primary/10 text-primary" };
}

function PulseUpdateRow({
  update,
  onPhotoPress,
}: {
  update: WebPulseUpdate;
  onPhotoPress: (update: WebPulseUpdate, index: number) => void;
}) {
  const { Icon, tile } = updateVisual(update.type);
  const title = update.type.replace(/_/g, " ");
  const body = update.content?.trim() || update.previewText?.trim() || "";
  const time = relativeTime(update.createdAt);
  const pics = isWebPulsePicsUpdate(update) ? resolveWebPicsUrls(update) : [];
  const detailHref = `/web-app/my-pulse/update/${update.id}`;

  return (
    <li className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 transition hover:border-white/15 hover:bg-white/[0.05]">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl border ${tile}`}>
        {update.isPinned ? <Pin className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold capitalize leading-snug text-foreground wrap-anywhere">
            {title}
            {update.mood ? <span className="font-normal text-muted-foreground"> · {update.mood}</span> : null}
          </p>
          {time ? <span className="shrink-0 text-[11px] text-muted-foreground">{time}</span> : null}
        </div>
        {body ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground wrap-anywhere">{body}</p>
        ) : null}

        {pics.length > 0 ? (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {pics.slice(0, 4).map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => onPhotoPress(update, index)}
                className="group relative size-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30"
                aria-label={`View photo ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="size-full object-cover transition group-hover:scale-[1.03]" />
                <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/20">
                  <Expand className="size-3.5 text-white opacity-0 transition group-hover:opacity-100" aria-hidden />
                </span>
              </button>
            ))}
            {pics.length > 4 ? (
              <button
                type="button"
                onClick={() => onPhotoPress(update, 4)}
                className="grid size-16 shrink-0 place-items-center rounded-lg border border-teal-400/30 bg-teal-400/10 text-xs font-bold text-teal-200"
              >
                +{pics.length - 4}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3.5" aria-hidden />
            {formatCount(update.likeCount)}
          </span>
          <Link
            href={`${detailHref}?focus=comments`}
            className="inline-flex items-center gap-1 transition hover:text-teal-300"
          >
            <MessageCircle className="size-3.5" aria-hidden />
            {formatCount(update.commentCount)}
          </Link>
        </div>
      </div>
    </li>
  );
}

export function WebPulseUpdatesSection({
  pulseUpdates,
  profile,
  copy,
  isOwner,
  openAppHref,
  externalProps,
}: {
  pulseUpdates: WebPulseUpdate[];
  profile: WebProfileHeader;
  copy: WebAppProfileCopy;
  isOwner: boolean;
  openAppHref: string;
  externalProps: React.AnchorHTMLAttributes<HTMLAnchorElement>;
}) {
  const creator = useMemo(
    () => ({
      id: profile.id,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    }),
    [profile.avatarUrl, profile.displayName, profile.id],
  );

  const [viewerSession, setViewerSession] = useState<{
    items: ReturnType<typeof buildWebPulseUpdatePhotoGallery>;
    initialIndex: number;
  } | null>(null);

  const openPhotoViewer = useCallback((update: WebPulseUpdate, index: number) => {
    const items = buildWebPulseUpdatePhotoGallery(update);
    if (!items.length) return;
    setViewerSession({ items, initialIndex: index });
  }, []);

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-300/80">
            {copy.myPulseKicker}
          </span>
          <div className="mt-0.5 flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--accent)]" aria-hidden />
            <h2 className="font-heading text-base font-bold tracking-tight text-foreground">
              {copy.pulseUpdatesTitle}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isOwner ? copy.myPulseSubtitleOwner : copy.myPulseSubtitleVisitor}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-baseline gap-0.5 rounded-full border border-teal-400/35 bg-teal-400/12 px-2.5 py-1">
          <span className="text-sm font-extrabold tabular-nums text-teal-300">
            {Math.min(pulseUpdates.length, 5)}
          </span>
          <span className="text-[11px] font-bold tabular-nums text-teal-300/65">/5</span>
        </span>
      </div>
      {pulseUpdates.length === 0 ? (
        <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-center text-sm text-muted-foreground">
          {copy.pulseUpdatesEmpty}
        </p>
      ) : (
        <>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {pulseUpdates.map((update) => (
              <PulseUpdateRow key={update.id} update={update} onPhotoPress={openPhotoViewer} />
            ))}
          </ul>
          <a
            href={openAppHref}
            {...externalProps}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-foreground/90 transition hover:border-primary/40 hover:text-foreground"
          >
            {copy.viewAllUpdates}
            <ChevronRight className="size-4" aria-hidden />
          </a>
        </>
      )}

      <WebPulsePhotoViewerHost
        session={
          viewerSession
            ? {
                items: viewerSession.items,
                initialIndex: viewerSession.initialIndex,
                creator,
                engagement: {
                  like: copy.engagement.like,
                  liked: copy.engagement.liked,
                  likeError: copy.engagement.likeError,
                  pulse: "Pulse",
                  pulsed: "Pulsed",
                },
              }
            : null
        }
        onClose={() => setViewerSession(null)}
      />
    </>
  );
}
