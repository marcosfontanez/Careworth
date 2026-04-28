import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Flame,
  MessageSquare,
  Radio,
  ScreenShare,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { marketingGutterX, marketingCardMuted, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import {
  liveDiscoverCategories,
  liveFeaturedSessions,
  liveTopNow,
  liveWhyGoLive,
} from "@/mock/marketing";

export function FeatureLiveLanding() {
  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-14">
        <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-primary/10 blur-[80px]" />
        <div className={cn(marketingGutterX, "relative grid items-center gap-14 lg:grid-cols-2")}>
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-violet-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
              </span>
              Live
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              Go live with the{" "}
              <span className="bg-gradient-to-r from-primary via-[#4d9fff] to-[var(--accent)] bg-clip-text text-transparent">
                healthcare
              </span>{" "}
              world.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Host AMAs, teaching moments, and on-shift stories with HD video, respectful chat, and moderation built for
              licensed audiences.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className={cn("h-12 rounded-full px-7 font-semibold", shadowPrimaryCta, "bg-primary text-primary-foreground")}>
                <Link href="/download" className="inline-flex items-center gap-2">
                  Go live now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.04] px-7 font-semibold">
                <Link href="/features">Explore Live</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 text-xs text-muted-foreground sm:grid-cols-4 sm:text-sm">
              {[
                { icon: Video, label: "HD video & audio" },
                { icon: MessageSquare, label: "Live chat & Q&A" },
                { icon: ScreenShare, label: "Screen share" },
                { icon: Users, label: "Guest co-hosts" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-[rgba(5,10,20,0.85)] p-1 shadow-[0_24px_80px_-24px_rgba(45,127,249,0.35)] ring-1 ring-primary/20 backdrop-blur-md">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-slate-950">
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  <div>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                      <Radio className="h-7 w-7 text-[var(--accent)]" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">Live preview</p>
                    <p className="text-xs text-muted-foreground">Dr. Arjun Patel · critical care</p>
                  </div>
                </div>
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Live
                </div>
                <div className="absolute right-3 top-3 rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-white">
                  1.2K watching
                </div>
                <div className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-2 border-t border-white/10 bg-black/40 px-3 py-2 text-[10px] text-muted-foreground">
                  <span>Mic · Cam · Share · Participants · Chat</span>
                  <span className="rounded bg-red-600/90 px-2 py-0.5 text-white">Leave</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 px-2 pb-2 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-[10px] text-muted-foreground">
                  Q&amp;A · top questions
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-[10px] text-muted-foreground">
                  Chat · moderated
                </div>
                <div className="hidden rounded-lg border border-violet-500/25 bg-violet-500/10 p-2 text-[10px] text-violet-100 sm:block">
                  Upvotes pinned
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-12")}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Featured Live</h2>
          <Link href="/download" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            View all Live
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {liveFeaturedSessions.map((s) => (
            <div key={s.title} className={cn("overflow-hidden rounded-2xl border border-white/10", marketingCardMuted)}>
              <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-950">
                <div className="absolute left-3 top-3">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      s.status === "live" ? "bg-red-600 text-white" : "bg-white/15 text-foreground",
                    )}
                  >
                    {s.status === "live" ? "Live" : "Scheduled"}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 rounded-md bg-black/55 px-2 py-0.5 text-[10px] text-white">
                  {s.viewers} viewers
                </div>
              </div>
              <div className="p-4">
                <p className="font-semibold text-foreground">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {s.host} · {s.specialty}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-20")}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className={cn("rounded-2xl p-6", marketingCardMuted)}>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Flame className="h-4 w-4 text-orange-400" />
              Top Lives right now
            </h3>
            <ol className="mt-4 space-y-4">
              {liveTopNow.map((row) => (
                <li key={row.rank} className="flex gap-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{row.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{row.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.host}</p>
                  </div>
                  <span className="shrink-0 text-xs text-orange-300/90">{row.viewers}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className={cn("rounded-2xl p-6", marketingCardMuted)}>
            <h3 className="text-sm font-semibold text-foreground">Discover more</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {liveDiscoverCategories.map((c) => (
                <div
                  key={c.title}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-primary/35"
                >
                  <Radio className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-xs font-semibold text-foreground">{c.title}</p>
                  <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={cn("rounded-2xl p-6", marketingCardMuted)}>
            <h3 className="text-sm font-semibold text-foreground">Creator spotlight</h3>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-violet-500" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">Dr. Arjun Patel</p>
                <p className="text-xs text-muted-foreground">Critical care · verified host</p>
              </div>
              <Button size="sm" variant="secondary" className="shrink-0 border border-white/10">
                Follow
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] py-2">
                <p className="font-semibold text-foreground">12.4K</p>
                <p>Followers</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] py-2">
                <p className="font-semibold text-foreground">89</p>
                <p>Lives</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] py-2">
                <p className="font-semibold text-emerald-300">97%</p>
                <p>Positive</p>
              </div>
            </div>
            <Link
              href="/download"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View profile
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="mt-14">
          <h2 className="text-center text-xl font-bold text-foreground sm:text-2xl">Why go Live on CareWorth?</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {liveWhyGoLive.map((item) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 text-primary">
                  <Radio className="h-4 w-4" />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 sm:gap-10">
          {[
            { bold: "25K+", sub: "Live sessions hosted" },
            { bold: "3.7M+", sub: "Live views" },
            { bold: "850K+", sub: "Healthcare professionals" },
            { bold: "190+", sub: "Countries reached" },
            { bold: "96%", sub: "Would recommend Live" },
          ].map((x) => (
            <div key={x.sub} className="text-center">
              <p className="text-lg font-bold text-foreground sm:text-xl">{x.bold}</p>
              <p className="mt-1 max-w-[160px] text-[10px] text-muted-foreground sm:text-xs">{x.sub}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
