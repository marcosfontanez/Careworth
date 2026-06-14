import Link from "next/link";
import { ArrowUpRight, Circle, LayoutList, Radio, Rss, ShoppingBag, UserCircle } from "lucide-react";

import { Marquee } from "@/components/marketing/marquee";
import { Reveal } from "@/components/marketing/reveal";
import { SpotlightCard } from "@/components/marketing/spotlight-card";
import {
  GrainOverlay,
  PremiumSectionHeader,
  WebsiteSectionBackdrop,
} from "@/components/marketing/website-visuals";
import type { Locale } from "@/lib/i18n";
import { getHomeFeatureShowcaseCopy } from "@/lib/marketing-copy/home-feature-showcase";
import { marketingFocusRing, marketingGutterX, marketingSection } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type TileTone = "cyan" | "blue" | "gold";

const TONE_TEXT: Record<TileTone, string> = {
  cyan: "text-[var(--accent)]",
  blue: "text-primary",
  gold: "text-[#E5B84B]",
};

const TONE_CHIP: Record<TileTone, string> = {
  cyan: "bg-accent/10 ring-[var(--accent)]/30",
  blue: "bg-primary/10 ring-primary/30",
  gold: "bg-[rgba(229,184,75,0.10)] ring-[rgba(229,184,75,0.30)]",
};

/**
 * Bento-grid platform map — the homepage's single product overview.
 * Mixed-size cells create hierarchy (Feed is the flagship), each cell is a
 * cursor-follow spotlight card, and the whole grid reveals on scroll.
 * Deeper stories live on /features.
 */
export function HomeFeatureShowcase({ locale }: { locale: Locale }) {
  const t = getHomeFeatureShowcaseCopy(locale);

  /* Real Circle specialties/topics — a discovery ticker, not fabricated proof. */
  const specialties = [
    "ICU",
    "ED",
    "Peds",
    "OR",
    "Med-Surg",
    "L&D",
    "NICU",
    "Oncology",
    "Cardiology",
    "Telemetry",
    "Mental Health",
    "Public Health",
    "Students",
    "Allied Health",
  ];

  const tiles = [
    { id: "feed", icon: Rss, href: "/features/feed", tone: "cyan", span: "col-span-2 sm:row-span-2", flagship: true },
    { id: "circles", icon: Circle, href: "/features/circles", tone: "blue", span: "col-span-2" },
    { id: "live", icon: Radio, href: "/features/live", tone: "blue", span: "", live: true },
    { id: "pulsePage", icon: UserCircle, href: "/features/pulse-page", tone: "cyan", span: "" },
    { id: "myPulse", icon: LayoutList, href: "/features/my-pulse", tone: "cyan", span: "col-span-2" },
    { id: "creator", icon: ShoppingBag, href: "/features", tone: "gold", span: "col-span-2" },
  ] as const;

  return (
    <section className={marketingSection}>
      <WebsiteSectionBackdrop variant="soft" animated />
      <GrainOverlay />
      <div className={cn("relative", marketingGutterX)}>
        <Reveal>
          <PremiumSectionHeader eyebrow={t.eyebrow} title={t.title} description={t.subtitle} />
        </Reveal>

        <ul className="mt-8 grid auto-rows-[minmax(6.5rem,1fr)] grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4">
          {tiles.map((tile, i) => {
            const card = t.cards[tile.id];
            const tone = tile.tone as TileTone;
            const Icon = tile.icon;
            const flagship = "flagship" in tile && tile.flagship;
            const live = "live" in tile && tile.live;
            return (
              <Reveal as="li" key={tile.id} delay={i * 70} className={cn(tile.span, "min-w-0")}>
                <SpotlightCard
                  conicBorder={flagship}
                  className={cn(
                    "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 ring-1 ring-white/4 backdrop-blur-md transition duration-200",
                    "hover:-translate-y-0.5 hover:border-(--accent)/40 hover:shadow-[0_28px_70px_-28px_rgba(20,184,166,0.45)]",
                    flagship
                      ? "bg-[rgba(10,18,34,0.78)] p-5 sm:p-6"
                      : "bg-[rgba(12,21,36,0.62)] p-4",
                  )}
                >
                  {flagship && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_30%_0%,rgba(0,210,255,0.12),transparent_60%)]"
                    />
                  )}
                  <Link
                    href={tile.href}
                    aria-label={`${card.title} — ${t.explore}`}
                    className={cn("absolute inset-0 z-10 rounded-2xl", marketingFocusRing)}
                  />
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-xl ring-1",
                      flagship ? "h-12 w-12" : "h-10 w-10",
                      TONE_CHIP[tone],
                      TONE_TEXT[tone],
                    )}
                  >
                    <Icon className={flagship ? "h-6 w-6" : "h-5 w-5"} aria-hidden />
                  </span>

                  <div className="relative z-0 mt-3 flex items-end justify-between gap-2">
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block truncate font-semibold tracking-tight text-foreground",
                          flagship ? "text-lg sm:text-xl" : "text-sm",
                        )}
                      >
                        {card.title}
                      </span>
                      {flagship && (
                        <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-(--accent)/90">
                          {t.explore}
                        </span>
                      )}
                      {live && (
                        <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                          </span>
                          {t.liveLabel}
                        </span>
                      )}
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 text-muted-foreground/60 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                      aria-hidden
                    />
                  </div>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </ul>

        <Reveal delay={120} className="mt-8 sm:mt-10">
          <Marquee>
            {specialties.map((label) => (
              <Link
                key={label}
                href="/features/circles"
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(12,21,36,0.6)] px-4 py-2 text-sm font-medium text-muted-foreground ring-1 ring-white/4 backdrop-blur-sm transition hover:border-(--accent)/40 hover:text-foreground",
                  marketingFocusRing,
                )}
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-(--accent)/70" />
                {label}
              </Link>
            ))}
          </Marquee>
        </Reveal>
      </div>
    </section>
  );
}
