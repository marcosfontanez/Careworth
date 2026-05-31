import Link from "next/link";
import {
  ChevronRight,
  Clock,
  Film,
  Heart,
  Layers,
  MessageCircle,
  PenLine,
  Play,
  Radio,
  Scissors,
  ShoppingBag,
  TriangleAlert,
  Upload,
  type LucideIcon,
} from "lucide-react";

import type { WebAppCreatorHubCopy } from "@/lib/marketing-copy/web-app";
import type { CreatorHubOverview, CreatorHubPost, CreatorHubStatus } from "@/lib/web-app/creator-hub-data";
import type { WebProfileHeader } from "@/lib/web-app/profile-data";
import { formatCount } from "@/lib/web-app/format";

function ToolTile({
  href,
  icon: Icon,
  label,
  primary,
  live,
  internal,
  external,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  primary?: boolean;
  live?: boolean;
  internal?: boolean;
  external: boolean;
}) {
  const className = [
    "group relative flex aspect-square flex-col items-center justify-center gap-2.5 rounded-3xl border p-4 text-center transition",
    primary
      ? "border-primary/40 bg-gradient-to-br from-primary/25 to-accent/15 shadow-[0_0_36px_-10px_rgba(45,127,249,0.8)] hover:brightness-110"
      : "border-white/10 bg-[rgba(12,18,32,0.8)] backdrop-blur-sm hover:border-white/20 hover:bg-[rgba(18,26,44,0.9)]",
  ].join(" ");

  const inner = (
    <>
      {live ? (
        <span
          className="absolute right-3 top-3 size-2 rounded-full bg-rose-500 shadow-[0_0_10px_2px_rgba(244,63,94,0.7)]"
          aria-hidden
        />
      ) : null}
      <span
        className={[
          "grid size-12 place-items-center rounded-2xl transition",
          primary
            ? "bg-white/15 text-white shadow-[0_0_20px_-4px_rgba(255,255,255,0.5)]"
            : "border border-white/10 bg-white/5 text-[var(--accent)] group-hover:text-white",
        ].join(" ")}
      >
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </>
  );

  if (internal) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  const externalProps = external ? { target: "_blank", rel: "noreferrer" } : {};
  return (
    <a href={href} {...externalProps} className={className}>
      {inner}
    </a>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-4 backdrop-blur-sm">
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

const STATUS_STYLES: Record<CreatorHubStatus, string> = {
  live: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  processing: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  scheduled: "border-sky-400/30 bg-sky-400/10 text-sky-200",
};

function statusLabel(status: CreatorHubStatus, copy: WebAppCreatorHubCopy): string {
  switch (status) {
    case "processing":
      return copy.statusProcessing;
    case "failed":
      return copy.statusFailed;
    case "scheduled":
      return copy.statusScheduled;
    default:
      return copy.statusLive;
  }
}

function RecentTile({ post, copy, openPostLabel }: { post: CreatorHubPost; copy: WebAppCreatorHubCopy; openPostLabel: string }) {
  const media = post.thumbnailUrl ?? post.mediaUrl;
  const isLive = post.status === "live";

  const card = (
    <div
      className={[
        "group relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-[#05080f] shadow-[0_18px_50px_-34px_rgba(0,0,0,0.95)]",
        isLive ? "" : "cursor-default",
      ].join(" ")}
    >
      {media && isLive ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.05]"
        />
      ) : (
        <div className="absolute inset-0 flex items-end bg-gradient-to-br from-[#101a35] to-[#0a1020] p-3">
          <p className="line-clamp-3 text-[11px] text-foreground/80 [overflow-wrap:anywhere]">
            {post.caption?.trim() || "—"}
          </p>
        </div>
      )}

      <span
        className={[
          "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
          STATUS_STYLES[post.status],
        ].join(" ")}
      >
        {statusLabel(post.status, copy)}
      </span>

      {post.isVideo && isLive ? (
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          <Play className="size-2.5 fill-current" aria-hidden />
        </span>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-2 pt-6 text-[11px] font-semibold text-white/85">
        ♥ {formatCount(post.likeCount)}
      </div>
    </div>
  );

  if (isLive) {
    return (
      <Link href={`/web-app/post/${post.id}`} aria-label={openPostLabel}>
        {card}
      </Link>
    );
  }
  return card;
}

function StatusChip({
  icon: Icon,
  label,
  count,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  tone: "live" | "processing" | "failed";
}) {
  if (count <= 0 && tone !== "live") return null;
  const tones: Record<string, string> = {
    live: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    processing: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    failed: "border-rose-400/25 bg-rose-400/10 text-rose-100",
  };
  return (
    <span className={["inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold", tones[tone]].join(" ")}>
      <Icon className="size-3.5" aria-hidden />
      {count} {label}
    </span>
  );
}

export function WebCreatorHub({
  profile,
  overview,
  recent,
  copy,
  createHref,
  openAppHref,
  shopHref,
  isExternalApp,
  openPostLabel,
}: {
  profile: WebProfileHeader;
  overview: CreatorHubOverview;
  recent: CreatorHubPost[];
  copy: WebAppCreatorHubCopy;
  createHref: string;
  openAppHref: string;
  shopHref: string;
  isExternalApp: boolean;
  openPostLabel: string;
}) {
  const externalProps = isExternalApp ? { target: "_blank", rel: "noreferrer" } : {};
  const pulseValue = profile.stats.pulseTier
    ? `${formatCount(profile.stats.pulseScore)} · ${profile.stats.pulseTier}`
    : formatCount(profile.stats.pulseScore);

  return (
    <div className="mx-auto w-full max-w-[940px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
      </header>

      {/* Overview */}
      <section className="mb-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">{copy.analyticsTitle}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat value={formatCount(overview.totalPosts)} label={copy.statPosts} />
          <Stat value={formatCount(profile.stats.followers)} label={copy.statFollowers} />
          <Stat value={formatCount(overview.recentLikes)} label={copy.statLikes} />
          <Stat value={pulseValue} label={copy.statPulse} />
        </div>
        {overview.recentLikes > 0 || overview.recentComments > 0 ? (
          <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Heart className="size-3.5 text-rose-400/80" aria-hidden />
              {formatCount(overview.recentLikes)} {copy.statLikes.toLowerCase()}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="size-3.5 text-[var(--accent)]" aria-hidden />
              {formatCount(overview.recentComments)} {copy.statComments.toLowerCase()}
            </span>
            <span className="text-muted-foreground/70">{copy.recentEngagementNote}</span>
          </p>
        ) : null}

        {(overview.processing > 0 || overview.failed > 0) && (
          <div className="mt-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {copy.contentStatusTitle}
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusChip icon={Film} label={copy.statusLive} count={overview.livePosts} tone="live" />
              <StatusChip icon={Clock} label={copy.statusProcessing} count={overview.processing} tone="processing" />
              <StatusChip icon={TriangleAlert} label={copy.statusFailed} count={overview.failed} tone="failed" />
            </div>
          </div>
        )}
      </section>

      {/* Creator tools */}
      <section className="mb-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">{copy.toolsTitle}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <ToolTile href={createHref} icon={PenLine} label={copy.createTileCta} primary internal external={isExternalApp} />
          <ToolTile href={openAppHref} icon={Upload} label={copy.uploadVideo} external={isExternalApp} />
          <ToolTile href={openAppHref} icon={Radio} label={copy.goLive} live external={isExternalApp} />
          <ToolTile href={openAppHref} icon={Layers} label={copy.brollStudio} external={isExternalApp} />
          <ToolTile href={openAppHref} icon={Scissors} label={copy.clipStudio} external={isExternalApp} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{copy.createNote}</p>
      </section>

      {/* B-roll Studio + Shop summary */}
      <section className="mb-7 grid gap-3 md:grid-cols-2">
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[rgba(18,26,44,0.92)] to-[rgba(12,18,32,0.82)] p-4 backdrop-blur-sm">
          <div className="min-w-0">
            <div className="mb-1 inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--accent)]">
              <Layers className="size-4" aria-hidden />
            </div>
            <h3 className="text-sm font-bold text-foreground">{copy.brollTitle}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{copy.brollBody}</p>
          </div>
          <a
            href={openAppHref}
            {...externalProps}
            className="inline-flex shrink-0 items-center gap-1 self-end rounded-full border border-white/12 px-3.5 py-1.5 text-xs font-semibold text-foreground/90 transition hover:border-white/25"
          >
            {copy.openInApp}
            <ChevronRight className="size-3.5" aria-hidden />
          </a>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.6)] p-4 backdrop-blur-sm">
          <div className="min-w-0">
            <div className="mb-1 inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--accent)]">
              <ShoppingBag className="size-4" aria-hidden />
            </div>
            <h3 className="text-sm font-bold text-foreground">{copy.shopTitle}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{copy.shopBody}</p>
            {profile.frame?.label ? (
              <p className="mt-1.5 text-[11px] text-foreground/70">
                <span className="text-muted-foreground">{copy.equippedBorder}:</span> {profile.frame.label}
              </p>
            ) : null}
          </div>
          <Link
            href={shopHref}
            className="inline-flex shrink-0 items-center gap-1 self-end rounded-full border border-white/12 px-3.5 py-1.5 text-xs font-semibold text-foreground/90 transition hover:border-white/25"
          >
            {copy.shopCta}
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </section>

      {/* Recent content */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Film className="size-4" aria-hidden />
          {copy.uploadsTitle}
        </h2>
        {recent.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-8 text-center backdrop-blur-sm">
            <p className="text-sm text-muted-foreground">{copy.uploadsEmpty}</p>
            <Link
              href={createHref}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_0_28px_-8px_rgba(45,127,249,0.9)] transition hover:brightness-110"
            >
              <PenLine className="size-4" aria-hidden />
              {copy.createTileCta}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
            {recent.map((post) => (
              <RecentTile key={post.id} post={post} copy={copy} openPostLabel={openPostLabel} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
