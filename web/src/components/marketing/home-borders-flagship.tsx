import Link from "next/link";
import {
  ArrowRight,
  Frame,
  Gift,
  Heart,
  Megaphone,
  MessageSquare,
  Sparkles,
  Store,
  UserCircle,
  Users,
  Vault,
  Video,
} from "lucide-react";

import {
  OrbitDots,
  PosterCaptionStrip,
  PosterFrame,
  PremiumSectionHeader,
  SpotlightBeam,
  WebsiteSectionBackdrop,
} from "@/components/marketing/website-visuals";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { getHomeBordersCopy } from "@/lib/marketing-copy/home-page-sections";
import { marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * Borders flagship — identity layer across the app (poster-led).
 *
 * Mirrors the Sparks & Diamonds flagship pattern: the uploaded
 * marketing infographic is the centerpiece; the surrounding copy
 * stays headline-weight so the visual leads. Below the poster two
 * compact strips translate the infographic into shippable promises:
 *
 *   1. The four monthly border drop programs (free / premium /
 *      charity / partner) — color-toned per category to match the
 *      in-app palette.
 *   2. The six in-app surfaces where a border actually appears
 *      (feed, circles, comments/profiles, customize, vault, shop).
 */
export function HomeBordersFlagship({ locale }: { locale: Locale }) {
  const c = getHomeBordersCopy(locale);

  return (
    <section
      id="borders"
      className="relative isolate overflow-hidden border-t border-white/5 py-24 sm:py-28 lg:py-32"
    >
      <WebsiteSectionBackdrop variant="spotlight" />
      <div className={marketingGutterX}>
        <PremiumSectionHeader
          eyebrow={c.eyebrow}
          title={c.title}
          description={c.description}
        />

        {/* Tone kicker — cyan / gold / violet / green = the four drop palettes. */}
        <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <Gift className="h-3.5 w-3.5" aria-hidden />
            Free monthly
          </span>
          <span aria-hidden className="hidden h-px w-5 bg-white/15 sm:block" />
          <span className="inline-flex items-center gap-1.5 text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Premium
          </span>
          <span aria-hidden className="hidden h-px w-5 bg-white/15 sm:block" />
          <span className="inline-flex items-center gap-1.5 text-amber-300">
            <Heart className="h-3.5 w-3.5" aria-hidden />
            Charity
          </span>
          <span aria-hidden className="hidden h-px w-5 bg-white/15 sm:block" />
          <span className="inline-flex items-center gap-1.5 text-violet-300">
            <Megaphone className="h-3.5 w-3.5" aria-hidden />
            Partner drop
          </span>
        </div>

        {/* Flagship infographic — full-width centerpiece, dramatic glow. */}
        <div className="relative mt-14 sm:mt-16">
          <SpotlightBeam tone="cyan" intensity="strong" />
          <OrbitDots tone="cyan" preset="hero" />
          <PosterFrame
            src="/marketing/borders-overview.png"
            alt="PulseVerse Borders — four ways to get exclusive borders every month, seen across feed, circles, comments and Pulse Shop."
            width={1024}
            height={682}
            glow="cyan"
            size="dramatic"
            tag={{ label: c.posterTag }}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 95vw, 1180px"
            className={cn("mx-auto max-w-6xl")}
          />
          <PosterCaptionStrip device="In-app" context={c.posterCaption} tone="cyan" />
        </div>

        {/* Four monthly drop programs — color-toned per category. */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.drops.map((drop, idx) => {
            const palette = DROP_PALETTES[idx]!;
            const Icon = palette.icon;
            return (
              <article
                key={drop.title}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border bg-[rgba(8,14,26,0.65)] p-5 backdrop-blur-md transition-colors",
                  palette.border,
                )}
              >
                {/* Tinted top wash — sets the category tone without shouting. */}
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 h-24 opacity-90",
                    palette.wash,
                  )}
                />
                <div className="relative">
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                      palette.badgeBorder,
                      palette.badgeText,
                    )}
                  >
                    <Icon className="h-3 w-3" aria-hidden />
                    {drop.badge}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground sm:text-lg">
                    {drop.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {drop.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {/* Surfaces strip — where a border actually appears. */}
        <div className="mt-14">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]/90">
            {c.surfacesEyebrow}
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {c.surfaces.map((s, idx) => {
              const Icon = SURFACE_ICONS[idx] ?? Frame;
              return (
                <li
                  key={s.surface}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <span
                    className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{s.surface}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{s.line}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* CTAs */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Button
            size="lg"
            className="h-11 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/features" className="inline-flex items-center gap-2">
              {c.ctaPrimary}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 rounded-full border-white/15 bg-white/[0.03] px-6 font-semibold hover:bg-white/[0.07]"
            asChild
          >
            <Link href="/features/my-pulse">{c.ctaSecondary}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- */
/*  Per-category palette + icon mapping — kept local to the section so it    */
/*  doesn't leak into the global tone tokens. Order matches `c.drops`.        */
/* ------------------------------------------------------------------------- */

type DropPalette = {
  icon: typeof Gift;
  wash: string;
  border: string;
  badgeBorder: string;
  badgeText: string;
};

const DROP_PALETTES: readonly DropPalette[] = [
  // Free monthly holiday — green
  {
    icon: Gift,
    wash: "bg-[radial-gradient(120%_60%_at_50%_0%,rgba(34,197,94,0.22),transparent_60%)]",
    border: "border-emerald-400/25 hover:border-emerald-400/40",
    badgeBorder: "border-emerald-400/40",
    badgeText: "text-emerald-300",
  },
  // Premium drop — cyan / accent
  {
    icon: Sparkles,
    wash: "bg-[radial-gradient(120%_60%_at_50%_0%,rgba(45,212,191,0.22),transparent_60%)]",
    border: "border-[var(--accent)]/25 hover:border-[var(--accent)]/45",
    badgeBorder: "border-[var(--accent)]/45",
    badgeText: "text-[var(--accent)]",
  },
  // Charity — gold
  {
    icon: Heart,
    wash: "bg-[radial-gradient(120%_60%_at_50%_0%,rgba(229,184,75,0.22),transparent_60%)]",
    border: "border-amber-300/25 hover:border-amber-300/45",
    badgeBorder: "border-amber-300/45",
    badgeText: "text-amber-300",
  },
  // Partner drop — violet
  {
    icon: Megaphone,
    wash: "bg-[radial-gradient(120%_60%_at_50%_0%,rgba(167,139,250,0.22),transparent_60%)]",
    border: "border-violet-300/25 hover:border-violet-300/45",
    badgeBorder: "border-violet-300/45",
    badgeText: "text-violet-300",
  },
];

/** Icon for each surface tile — order matches `c.surfaces`. */
const SURFACE_ICONS = [Video, Users, MessageSquare, UserCircle, Vault, Store];
