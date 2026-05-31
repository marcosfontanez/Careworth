import Link from "next/link";
import { ArrowRight, Calendar, Eye, Radio, ShieldCheck, UserRound } from "lucide-react";

import type { WebAppLiveCopy } from "@/lib/marketing-copy/web-app";
import type { WebLiveResult, WebLiveStream } from "@/lib/web-app/live-data";
import { formatCount, relativeTime } from "@/lib/web-app/format";

/** Timezone-agnostic countdown for scheduled streams ("in 2h", "in 3d", "soon"). */
function untilLabel(iso: string | null): string {
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

function HostRow({ host, fallback }: { host: WebLiveStream["host"]; fallback: string }) {
  const name = host?.displayName || fallback;
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary/60">
        {host?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={host.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <UserRound className="size-3.5 text-muted-foreground" aria-hidden />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-foreground">{name}</span>
        {host?.username ? (
          <span className="block truncate text-[11px] text-muted-foreground">@{host.username}</span>
        ) : null}
      </span>
    </div>
  );
}

function LiveCard({ stream, copy }: { stream: WebLiveStream; copy: WebAppLiveCopy }) {
  const started = relativeTime(stream.startedAt);

  return (
    <Link
      href={`/web-app/live/${stream.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.82)] shadow-[0_24px_70px_-44px_rgba(0,0,0,0.95)] backdrop-blur-sm transition hover:border-rose-400/40 hover:shadow-[0_24px_70px_-38px_rgba(0,0,0,0.95),0_0_34px_-16px_rgba(244,63,94,0.6)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[#05080f]">
        {stream.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stream.thumbnailUrl}
            alt=""
            className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-[#15203c] to-[#0a1020]">
            <Radio className="size-9 text-white/30" aria-hidden />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_0_16px_-2px_rgba(244,63,94,0.9)]">
          <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
          {copy.liveBadge}
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <Eye className="size-3.5" aria-hidden />
          {formatCount(stream.viewerCount)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <HostRow host={stream.host} fallback={copy.hostFallback} />
        <h3 className="line-clamp-2 font-heading text-base font-bold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere]">
          {stream.title}
        </h3>
        <div className="mt-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          {stream.category ? (
            <span className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 font-medium capitalize text-foreground/80">
              {stream.category}
            </span>
          ) : null}
          {started ? (
            <span>
              {copy.startedLabel} {started}
            </span>
          ) : null}
        </div>
        <span className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(244,63,94,0.8)] transition group-hover:brightness-110">
          {copy.viewLabel}
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function UpcomingCard({ stream, copy }: { stream: WebLiveStream; copy: WebAppLiveCopy }) {
  return (
    <Link
      href={`/web-app/live/${stream.id}`}
      className="group flex items-center gap-3.5 rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-3.5 backdrop-blur-sm transition hover:border-primary/30 hover:bg-[rgba(18,26,44,0.9)]"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/20 to-accent/10 text-[var(--accent)]">
        <Calendar className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-heading text-sm font-bold tracking-tight text-foreground [overflow-wrap:anywhere]">
          {stream.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {stream.host?.displayName || copy.hostFallback}
          {stream.category ? ` · ${stream.category}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-right text-[11px] font-semibold text-[var(--accent)]">
        <span className="block text-muted-foreground">{copy.scheduledLabel}</span>
        {untilLabel(stream.scheduledFor)}
      </span>
    </Link>
  );
}

export function WebLive({ result, copy }: { result: WebLiveResult; copy: WebAppLiveCopy }) {
  return (
    <div className="mx-auto w-full max-w-[940px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight text-foreground">
          <Radio className="size-6 text-rose-400" aria-hidden />
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
      </header>

      {result.state === "error" ? (
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.8)] p-8 text-center backdrop-blur-sm">
          <p className="text-base font-semibold text-foreground">{copy.errorTitle}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.errorBody}</p>
        </div>
      ) : result.liveNow.length === 0 && result.upcoming.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.8)] p-10 text-center backdrop-blur-sm">
          <span className="mx-auto grid size-14 place-items-center rounded-full border border-white/10 bg-white/5">
            <Radio className="size-6 text-muted-foreground" aria-hidden />
          </span>
          <p className="mt-4 text-base font-semibold text-foreground">{copy.emptyTitle}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.emptyBody}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {result.liveNow.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <span className="inline-flex size-2 items-center justify-center">
                  <span className="size-2 animate-pulse rounded-full bg-rose-500" aria-hidden />
                </span>
                {copy.liveNowTitle}
              </h2>
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {result.liveNow.map((stream) => (
                  <LiveCard key={stream.id} stream={stream} copy={copy} />
                ))}
              </div>
            </section>
          ) : null}

          {result.upcoming.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <Calendar className="size-4" aria-hidden />
                {copy.upcomingTitle}
              </h2>
              <div className="flex flex-col gap-2.5">
                {result.upcoming.map((stream) => (
                  <UpcomingCard key={stream.id} stream={stream} copy={copy} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <p className="mt-8 flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/8 p-3.5 text-xs leading-relaxed text-primary/90">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <span className="font-semibold">{copy.safetyTitle}.</span> {copy.safetyBody}
        </span>
      </p>
    </div>
  );
}
