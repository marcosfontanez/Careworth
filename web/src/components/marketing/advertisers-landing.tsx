import {
  ArrowRight,
  BarChart2,
  Check,
  Globe,
  HeartHandshake,
  LayoutPanelTop,
  Megaphone,
  Radio,
  Shield,
  Users,
  Video,
} from "lucide-react";

import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { Button } from "@/components/ui/button";
import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import type { Locale } from "@/lib/i18n";
import { getAdvertisersLandingCopy } from "@/lib/marketing-copy/advertisers-landing";
import { marketingCardMuted, marketingEyebrow, marketingGutterX, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const placementIcons = [LayoutPanelTop, Users, Video, Radio] as const;
const driveIcons = [HeartHandshake, Radio, BarChart2, Globe] as const;
const solutionIcons = [Megaphone, Users, Radio, Video, BarChart2] as const;
const scaleIcons = [Users, Globe, Radio, Video] as const;

export function AdvertisersLanding({ locale }: { locale: Locale }) {
  const c = getAdvertisersLandingCopy(locale);

  return (
    <>
      <MarketingBreadcrumbs path="/advertisers" />
      <section className="relative overflow-hidden pb-20 pt-10 sm:pt-14">
        <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-primary/15 blur-[100px]" />
        <div className={cn(marketingGutterX, "relative grid gap-14 lg:grid-cols-2 lg:items-center")}>
          <div>
            <p className={marketingEyebrow}>{c.hero.eyebrow}</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.35rem]">
              {c.hero.titleBefore}{" "}
              <span className="bg-gradient-to-r from-primary via-[#4d9fff] to-[var(--accent)] bg-clip-text text-transparent">
                {c.hero.titleGradient}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{c.hero.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className={cn("h-12 rounded-full px-7 font-semibold", shadowPrimaryCta, "bg-primary text-primary-foreground")}>
                <MarketingDestinationLink href="/contact" analyticsSource="advertisers_hero_media_kit" className="inline-flex items-center gap-2">
                  {c.hero.ctaMediaKit}
                  <ArrowRight className="h-4 w-4" />
                </MarketingDestinationLink>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.04] px-7 font-semibold">
                <MarketingDestinationLink href="/contact" analyticsSource="advertisers_hero_partnerships">
                  {c.hero.ctaPartnerships}
                </MarketingDestinationLink>
              </Button>
            </div>
          </div>
          <div className="relative grid gap-4 sm:grid-cols-2">
            <div className={cn("rounded-2xl border border-white/10 p-5", marketingCardMuted, "sm:translate-y-8")}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">{c.preview.feedLabel}</p>
              <div className="mt-4 space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs text-muted-foreground">
                    {c.preview.sponsoredLine.replace("{n}", String(i))}
                  </div>
                ))}
              </div>
            </div>
            <div className={cn("rounded-2xl border border-white/10 p-5", marketingCardMuted)}>
              <p className="text-xs font-semibold text-muted-foreground">{c.preview.liveLabel}</p>
              <div className="mt-4 aspect-video rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 ring-1 ring-primary/25">
                <div className="flex h-full items-end p-3 text-[10px] text-white/80">{c.preview.lowerThird}</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <MarketingPageShell className="!py-0 pb-10">
        <p className={marketingEyebrow}>{c.whyEyebrow}</p>
        <h2 className="mt-2 max-w-3xl text-2xl font-bold text-foreground sm:text-3xl">{c.whyTitle}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {c.differentiation.map((d) => (
            <div key={d.title} className={cn("rounded-2xl p-6", marketingCardMuted)}>
              <p className="text-sm font-semibold text-foreground">{d.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">{c.whyFooter}</p>
      </MarketingPageShell>

      <MarketingPageShell className="!py-0 pb-6">
        <h2 className="max-w-3xl text-2xl font-bold text-foreground sm:text-3xl">{c.audiencesTitle}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {c.audiences.map((a) => (
            <div
              key={a.title}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b ring-1 ring-white/[0.04]",
                a.tint,
              )}
            >
              <div className="h-28 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">{a.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
                <p className="mt-auto pt-4 text-lg font-bold text-foreground">{a.count}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className={cn("rounded-2xl p-8", marketingCardMuted)}>
            <p className={marketingEyebrow}>{c.scaleEyebrow}</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {c.scaleStats.map((label, i) => {
                const Icon = scaleIcons[i] ?? Users;
                return (
                  <div key={label} className="flex gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm font-medium text-foreground">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={cn("rounded-2xl p-8", marketingCardMuted)}>
            <h3 className="text-lg font-bold text-foreground">{c.drivesTitle}</h3>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {c.driveEngagement.map((d, i) => {
                const Icon = driveIcons[i] ?? HeartHandshake;
                return (
                  <div key={d.title} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{d.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{d.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-20">
          <p className={marketingEyebrow}>{c.placementsEyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground">{c.placementsTitle}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.placements.map((p, i) => {
              const Icon = placementIcons[i] ?? LayoutPanelTop;
              return (
                <div key={p.title} className={cn("rounded-2xl p-5", marketingCardMuted)}>
                  <div className="mb-12 aspect-[4/3] rounded-xl border border-dashed border-white/15 bg-white/[0.02]" />
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 font-semibold text-foreground">{p.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className={cn("mt-16 grid gap-8 rounded-2xl border border-[var(--accent)]/25 bg-[rgba(12,21,36,0.65)] p-8 lg:grid-cols-2 lg:items-center", marketingCardMuted)}>
          <div>
            <p className={marketingEyebrow}>{c.safeEyebrow}</p>
            <h2 className="mt-3 text-2xl font-bold text-foreground">{c.safeTitle}</h2>
            <ul className="mt-6 space-y-3">
              {c.safetyChecks.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="flex h-40 w-40 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 shadow-[0_0_60px_-12px_rgba(0,210,255,0.45)]">
              <Shield className="h-20 w-20 text-[var(--accent)]" strokeWidth={1.25} />
            </div>
          </div>
        </div>

        <div className="mt-20">
          <h2 className="text-xl font-bold text-foreground">{c.solutionsTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {c.solutions.map((s, i) => {
              const Icon = solutionIcons[i] ?? Megaphone;
              return (
                <div key={s.title} className={cn("rounded-2xl p-5 text-center", marketingCardMuted)}>
                  <Icon className="mx-auto h-6 w-6 text-primary" />
                  <p className="mt-3 text-sm font-semibold text-foreground">{s.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </MarketingPageShell>
    </>
  );
}
