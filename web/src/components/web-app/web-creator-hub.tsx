import Link from "next/link";
import {
  ChevronRight,
  Film,
  ImagePlus,
  Layers,
  Play,
  Radio,
  Scissors,
  Upload,
  type LucideIcon,
} from "lucide-react";

import type { WebAppCreatorHubCopy } from "@/lib/marketing-copy/web-app";
import type { WebProfileHeader, WebProfilePost } from "@/lib/web-app/profile-data";
import { formatCount } from "@/lib/web-app/format";

function CreateTile({
  href,
  icon: Icon,
  label,
  primary,
  live,
  external,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  primary?: boolean;
  live?: boolean;
  external: boolean;
}) {
  const externalProps = external ? { target: "_blank", rel: "noreferrer" } : {};
  return (
    <a
      href={href}
      {...externalProps}
      className={[
        "group relative flex aspect-square flex-col items-center justify-center gap-2.5 rounded-3xl border p-4 text-center transition",
        primary
          ? "border-primary/40 bg-gradient-to-br from-primary/25 to-accent/15 shadow-[0_0_36px_-10px_rgba(45,127,249,0.8)] hover:brightness-110"
          : "border-white/10 bg-[rgba(12,18,32,0.8)] backdrop-blur-sm hover:border-white/20 hover:bg-[rgba(18,26,44,0.9)]",
      ].join(" ")}
    >
      {live ? (
        <span className="absolute right-3 top-3 size-2 rounded-full bg-rose-500 shadow-[0_0_10px_2px_rgba(244,63,94,0.7)]" aria-hidden />
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

function UploadTile({ post, openPostLabel }: { post: WebProfilePost; openPostLabel: string }) {
  const media = post.thumbnailUrl ?? post.mediaUrl;
  return (
    <Link
      href={`/post/${post.id}`}
      aria-label={openPostLabel}
      className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-[#05080f] shadow-[0_18px_50px_-34px_rgba(0,0,0,0.95)]"
    >
      {media ? (
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
      {post.isVideo ? (
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          <Play className="size-2.5 fill-current" aria-hidden />
        </span>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-2 pt-6 text-[11px] font-semibold text-white/85">
        ♥ {formatCount(post.likeCount)}
      </div>
    </Link>
  );
}

export function WebCreatorHub({
  profile,
  posts,
  copy,
  openAppHref,
  isExternalApp,
  openPostLabel,
}: {
  profile: WebProfileHeader;
  posts: WebProfilePost[];
  copy: WebAppCreatorHubCopy;
  openAppHref: string;
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

      {/* Create tiles */}
      <section className="mb-7">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <CreateTile href={openAppHref} icon={Upload} label={copy.uploadVideo} primary external={isExternalApp} />
          <CreateTile href={openAppHref} icon={Radio} label={copy.goLive} live external={isExternalApp} />
          <CreateTile href={openAppHref} icon={Layers} label={copy.brollStudio} external={isExternalApp} />
          <CreateTile href={openAppHref} icon={Scissors} label={copy.clipStudio} external={isExternalApp} />
          <CreateTile href={openAppHref} icon={ImagePlus} label={copy.newPost} external={isExternalApp} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{copy.createNote}</p>
      </section>

      {/* Analytics */}
      <section className="mb-7">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {copy.analyticsTitle}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Stat value={formatCount(profile.stats.followers)} label={copy.statFollowers} />
          <Stat value={formatCount(profile.stats.following)} label={copy.statFollowing} />
          <Stat value={pulseValue} label={copy.statPulse} />
        </div>
      </section>

      {/* Drafts (managed in app) */}
      <section className="mb-7">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.6)] p-4 backdrop-blur-sm">
          <div>
            <h2 className="text-sm font-bold text-foreground">{copy.draftsTitle}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{copy.draftsNote}</p>
          </div>
          <a
            href={openAppHref}
            {...externalProps}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/12 px-3.5 py-1.5 text-xs font-semibold text-foreground/90 transition hover:border-white/25"
          >
            {copy.openInApp}
            <ChevronRight className="size-3.5" aria-hidden />
          </a>
        </div>
      </section>

      {/* Recent uploads */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Film className="size-4" aria-hidden />
          {copy.uploadsTitle}
        </h2>
        {posts.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-8 text-center text-sm text-muted-foreground backdrop-blur-sm">
            {copy.uploadsEmpty}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5">
            {posts.map((post) => (
              <UploadTile key={post.id} post={post} openPostLabel={openPostLabel} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
