"use client";

import { Expand, Heart, Images, Play, Star, Video, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import type { WebAppEngagementCopy, WebAppProfileCopy } from "@/lib/marketing-copy/web-app";
import type { WebMediaItem, WebProfileMedia } from "@/lib/web-app/profile-data";
import {
  buildWebMediaHubPhotoGallery,
  findWebGalleryIndexByKey,
  type WebPulsePhotoViewerCreator,
} from "@/lib/web-app/pulse-photo-gallery";
import { formatCount } from "@/lib/web-app/format";
import { WebPulsePhotoViewerHost } from "./web-pulse-photo-viewer";

type TabKey = "videos" | "favorites" | "photos";

function MediaTile({
  item,
  onPhotoPress,
}: {
  item: WebMediaItem;
  onPhotoPress?: () => void;
}) {
  if (!item.isVideo && onPhotoPress) {
    return (
      <button
        type="button"
        onClick={onPhotoPress}
        className="group relative block aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/8 bg-[#05080f] text-left"
      >
        <MediaTileInner item={item} browsable />
      </button>
    );
  }

  const href = item.postId ? `/web-app/post/${item.postId}` : "#";
  return (
    <Link
      href={href}
      className="group relative block aspect-[3/4] overflow-hidden rounded-2xl border border-white/8 bg-[#05080f]"
    >
      <MediaTileInner item={item} />
    </Link>
  );
}

function MediaTileInner({ item, browsable = false }: { item: WebMediaItem; browsable?: boolean }) {
  return (
    <>
      {item.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt=""
          className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <span className="grid size-full place-items-center text-muted-foreground">
          {item.isVideo ? <Video className="size-7" aria-hidden /> : <Images className="size-7" aria-hidden />}
        </span>
      )}

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent"
      />

      {item.isVideo ? (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid size-10 place-items-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-sm transition group-hover:scale-110">
            <Play className="size-4 fill-current" aria-hidden />
          </span>
        </span>
      ) : browsable ? (
        <span className="pointer-events-none absolute left-2 top-2 grid size-6 place-items-center rounded-full border border-teal-400/35 bg-black/55 text-teal-200">
          <Expand className="size-3.5" aria-hidden />
        </span>
      ) : null}

      <span className="absolute bottom-2 right-2 grid size-6 place-items-center rounded-full border border-white/25 bg-black/65 text-white">
        {item.isVideo ? <Video className="size-3" aria-hidden /> : <Images className="size-3" aria-hidden />}
      </span>

      {item.likeCount > 0 ? (
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-xs font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
          <Heart className="size-3.5 fill-current text-rose-400" aria-hidden />
          {formatCount(item.likeCount)}
        </span>
      ) : null}
    </>
  );
}

function SegTab({
  active,
  icon: Icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2 transition"
    >
      <span
        className={[
          "inline-flex items-center gap-1.5 text-[13px] font-bold tracking-tight transition",
          active ? "text-teal-300" : "text-muted-foreground hover:text-foreground/80",
        ].join(" ")}
      >
        <Icon className="size-4" aria-hidden />
        {label}
        {active && count > 0 ? (
          <span className="tabular-nums text-[11px] text-teal-300/90">{count > 99 ? "99+" : count}</span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={[
          "h-0.5 w-7 rounded-full transition", active ? "bg-teal-300" : "bg-transparent",
        ].join(" ")}
      />
    </button>
  );
}

export function WebMediaHub({
  media,
  copy,
  engagement,
  isOwner,
  creator,
}: {
  media: WebProfileMedia;
  copy: WebAppProfileCopy;
  engagement: WebAppEngagementCopy;
  isOwner: boolean;
  creator: WebPulsePhotoViewerCreator;
}) {
  const [tab, setTab] = useState<TabKey>("videos");
  const [viewerSession, setViewerSession] = useState<{
    items: ReturnType<typeof buildWebMediaHubPhotoGallery>;
    initialIndex: number;
  } | null>(null);

  const tabs: { key: TabKey; icon: LucideIcon; label: string; items: WebMediaItem[] }[] = [
    { key: "videos", icon: Video, label: copy.mediaTabVideos, items: media.videos },
    ...(isOwner
      ? [{ key: "favorites" as const, icon: Star, label: copy.mediaTabFavorites, items: media.favorites }]
      : []),
    { key: "photos", icon: Images, label: copy.mediaTabPhotos, items: media.photos },
  ];

  const active = tabs.find((t) => t.key === tab) ?? tabs[0];

  const photoGallery = useMemo(() => buildWebMediaHubPhotoGallery(media.photos), [media.photos]);
  const favoritesPhotoGallery = useMemo(
    () => buildWebMediaHubPhotoGallery(media.favorites.filter((f) => !f.isVideo)),
    [media.favorites],
  );

  const openPhotoViewer = useCallback(
    (item: WebMediaItem, gallery: ReturnType<typeof buildWebMediaHubPhotoGallery>) => {
      if (!gallery.length) return;
      setViewerSession({
        items: gallery,
        initialIndex: findWebGalleryIndexByKey(gallery, item.key),
      });
    },
    [],
  );

  let emptyMsg: string;
  if (active.key === "videos") emptyMsg = isOwner ? copy.mediaEmptyVideosOwner : copy.mediaEmptyVideosVisitor;
  else if (active.key === "favorites") emptyMsg = copy.mediaEmptyFavorites;
  else emptyMsg = isOwner ? copy.mediaEmptyPhotosOwner : copy.mediaEmptyPhotosVisitor;

  return (
    <section>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-300/80">{copy.mediaHubKicker}</span>
      </div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-bold tracking-tight text-foreground">{copy.mediaHubTitle}</h2>
        <p className="hidden text-xs text-muted-foreground sm:block">
          {isOwner ? copy.mediaHubSubtitleOwner : copy.mediaHubSubtitleVisitor}
        </p>
      </div>

      <div
        role="tablist"
        className="mb-4 flex gap-1 rounded-2xl border border-white/8 bg-white/[0.03] p-1"
      >
        {tabs.map((t) => (
          <SegTab
            key={t.key}
            active={active.key === t.key}
            icon={t.icon}
            label={t.label}
            count={t.items.length}
            onClick={() => setTab(t.key)}
          />
        ))}
      </div>

      {active.items.length === 0 ? (
        <p className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
          {emptyMsg}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
          {active.items.map((item) => (
            <MediaTile
              key={item.key}
              item={item}
              onPhotoPress={
                active.key === "photos"
                  ? () => openPhotoViewer(item, photoGallery)
                  : active.key === "favorites" && !item.isVideo
                    ? () => openPhotoViewer(item, favoritesPhotoGallery)
                    : undefined
              }
            />
          ))}
        </div>
      )}

      <WebPulsePhotoViewerHost
        session={
          viewerSession
            ? {
                items: viewerSession.items,
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
    </section>
  );
}
