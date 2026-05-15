import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
import { getHomePulseDuoCopy } from "@/lib/marketing-copy/home-page-sections";
import { marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * Pulse Page vs My Pulse explainer — poster-led.
 *
 * The comparison poster already carries the labeled columns, the per-side
 * bullets, and the "Pulse Page · Your full identity hub / My Pulse · Your
 * rolling 5-slot expression feed" headings. We intentionally do NOT repeat
 * those beneath the poster — section copy is limited to a short context line
 * above and two link buttons below.
 */
export function HomePulseDuo({ locale }: { locale: Locale }) {
  const c = getHomePulseDuoCopy(locale);

  return (
    <section className="relative isolate overflow-hidden border-t border-white/5 py-24 sm:py-28 lg:py-32">
      <WebsiteSectionBackdrop variant="spotlight" />
      <div className={marketingGutterX}>
        <PremiumSectionHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />

        {/* Flagship comparison render — image dominates the section. */}
        <div className="relative mt-16 sm:mt-20">
          <SpotlightBeam tone="cyan" intensity="strong" />
          <OrbitDots tone="cyan" preset="pulse" />
          <PosterFrame
            src="/marketing/pulse-page-vs-my-pulse.png"
            alt="PulseVerse — Pulse Page (your full identity hub) vs My Pulse (your rolling 5-slot expression feed) on iPhone."
            width={1024}
            height={576}
            glow="cyan"
            size="dramatic"
            tag={{ label: c.posterTag }}
            className="mx-auto max-w-6xl"
          />
          <PosterCaptionStrip device="iPhone" context={c.posterCaption} tone="cyan" />
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {c.links.map((l, i) => (
            <Button
              key={l.href}
              variant={i === 0 ? "default" : "outline"}
              className={cn(
                "h-11 rounded-full px-6 font-semibold",
                i === 0
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-white/15 bg-white/[0.03] hover:bg-white/[0.07]",
              )}
              asChild
            >
              <Link href={l.href} className="inline-flex items-center gap-2">
                {l.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
