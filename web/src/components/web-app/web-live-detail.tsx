import Link from "next/link";
import { ArrowLeft, Calendar, ExternalLink, Eye, Play, Radio, ShieldCheck, UserRound } from "lucide-react";

import type { WebAppLiveCopy } from "@/lib/marketing-copy/web-app";
import type { WebLiveStream, WebLiveStreamStatus } from "@/lib/web-app/live-data";
import { formatCount, relativeTime } from "@/lib/web-app/format";

function startsIn(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = t - Date.now();
  if (diff <= 60_000) return "soon";
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `in ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `in ${hr}h`;
  return `in ${Math.floor(hr / 24)}d`;
}

function MoreLiveCard({ stream, copy }: { stream: WebLiveStream; copy: WebAppLiveCopy }) {
  return (
    <Link
      href={`/web-app/live/${stream.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-2.5 backdrop-blur-sm transition hover:border-rose-400/35 hover:bg-[rgba(18,26,44,0.9)]"
    >
      <span className="relative grid aspect-video w-28 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#05080f]">
        {stream.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stream.thumbnailUrl} alt="" className="size-full object-cover" />
        ) : (
          <Radio className="size-5 text-white/30" aria-hidden />
        )}
        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
          <span className="size-1 animate-pulse rounded-full bg-white" aria-hidden />
          {copy.liveBadge}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
          {stream.title}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Eye className="size-3" aria-hidden />
          {formatCount(stream.viewerCount)} · {stream.host?.displayName || copy.hostFallback}
        </p>
      </div>
    </Link>
  );
}

export function WebLiveDetail({
  stream,
  status,
  others,
  copy,
  openAppHref,
  isExternalApp,
}: {
  stream: WebLiveStream;
  status: WebLiveStreamStatus;
  others: WebLiveStream[];
  copy: WebAppLiveCopy;
  openAppHref: string;
  isExternalApp: boolean;
}) {
  const externalProps = isExternalApp ? { target: "_blank", rel: "noreferrer" } : {};
  const isLive = status === "live";
  const isScheduled = status === "scheduled";
  const isEnded = status === "ended";
  const started = relativeTime(stream.startedAt);

  return (
    <div className="mx-auto w-full max-w-[940px] px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/web-app/live"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {copy.backToLive}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          {/* Hero */}
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-white/10 bg-[#05080f] shadow-[0_30px_90px_-50px_rgba(0,0,0,0.95)]">
            {stream.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stream.thumbnailUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center bg-gradient-to-br from-[#15203c] to-[#0a1020]">
                <Radio className="size-12 text-white/25" aria-hidden />
              </div>
            )}
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

            {isLive ? (
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_0_18px_-2px_rgba(244,63,94,0.9)]">
                <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
                {copy.liveBadge}
              </span>
            ) : isScheduled ? (
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-[var(--accent)] backdrop-blur-sm">
                <Calendar className="size-3.5" aria-hidden />
                {copy.scheduledStartsLabel} {startsIn(stream.scheduledFor)}
              </span>
            ) : null}

            {isLive ? (
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <Eye className="size-3.5" aria-hidden />
                {formatCount(stream.viewerCount)}
              </span>
            ) : null}

            {/* Watch overlay (live + scheduled link out to the app) */}
            {!isEnded ? (
              <a
                href={openAppHref}
                {...externalProps}
                aria-label={copy.watchInApp}
                className="absolute inset-0 grid place-items-center"
              >
                <span className="grid size-[4.5rem] place-items-center rounded-full border border-white/30 bg-white/10 text-white shadow-[0_0_40px_-6px_rgba(244,63,94,0.9)] backdrop-blur-md transition hover:scale-105 hover:bg-white/20">
                  <Play className="size-7 translate-x-0.5 fill-current" aria-hidden />
                </span>
              </a>
            ) : null}
          </div>

          {/* Title + host */}
          <h1 className="mt-5 font-heading text-2xl font-bold tracking-tight text-foreground [overflow-wrap:anywhere]">
            {stream.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {stream.host?.id ? (
              <Link
                href={`/web-app/user/${stream.host.id}`}
                className="flex items-center gap-2.5 transition hover:opacity-80"
              >
                <HostAvatar host={stream.host} />
                <HostName host={stream.host} fallback={copy.hostFallback} />
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">
                <HostAvatar host={stream.host} />
                <HostName host={stream.host} fallback={copy.hostFallback} />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {stream.category ? (
              <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 font-medium capitalize text-foreground/80">
                {stream.category}
              </span>
            ) : null}
            {isLive && started ? (
              <span>
                {copy.startedLabel} {started}
              </span>
            ) : null}
            {isScheduled ? (
              <span className="text-[var(--accent)]">
                {copy.scheduledStartsLabel} {startsIn(stream.scheduledFor)}
              </span>
            ) : null}
          </div>

          {/* CTA / ended state */}
          {isEnded ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.8)] p-6 text-center backdrop-blur-sm">
              <p className="text-base font-semibold text-foreground">{copy.endedTitle}</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{copy.endedBody}</p>
              <Link
                href="/web-app/live"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-white/15"
              >
                <Radio className="size-4" aria-hidden />
                {copy.backToLive}
              </Link>
            </div>
          ) : (
            <>
              <a
                href={openAppHref}
                {...externalProps}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 text-base font-semibold text-white shadow-[0_12px_34px_-12px_rgba(244,63,94,0.85)] transition hover:brightness-110 sm:w-auto"
              >
                {copy.watchInApp}
                <ExternalLink className="size-4" aria-hidden />
              </a>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{copy.watchNote}</p>
            </>
          )}
        </div>

        {/* Side rail */}
        <aside className="flex flex-col gap-4">
          {others.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-rose-500" aria-hidden />
                {copy.moreLiveTitle}
              </h2>
              <div className="flex flex-col gap-2.5">
                {others.map((o) => (
                  <MoreLiveCard key={o.id} stream={o} copy={copy} />
                ))}
              </div>
            </section>
          ) : null}

          <p className="flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/8 p-3.5 text-xs leading-relaxed text-primary/90">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">{copy.safetyTitle}.</span> {copy.safetyBody}
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
}

function HostAvatar({ host }: { host: WebLiveStream["host"] }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary/60">
      {host?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={host.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <UserRound className="size-4 text-muted-foreground" aria-hidden />
      )}
    </span>
  );
}

function HostName({ host, fallback }: { host: WebLiveStream["host"]; fallback: string }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-foreground">
        {host?.displayName || fallback}
      </span>
      {host?.username ? (
        <span className="block truncate text-xs text-muted-foreground">@{host.username}</span>
      ) : null}
    </span>
  );
}
