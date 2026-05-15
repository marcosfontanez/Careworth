import { ArrowRight } from "lucide-react";

import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { getHomeCtaCopy } from "@/lib/marketing-copy/home";
import { marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * Premium homepage closing CTA — gradient panel with a faint
 * iPhone-shaped silhouette behind the copy. Differentiated from the
 * shared `CtaSection` used elsewhere in the marketing site.
 */
export function HomeFinalCta({ locale }: { locale: Locale }) {
  const c = getHomeCtaCopy(locale);
  return (
    <section className="relative isolate py-16 sm:py-20">
      <div className={marketingGutterX}>
        <div
          className={cn(
            "relative overflow-hidden rounded-[1.75rem] p-px",
            "bg-gradient-to-r from-[#0c1f4a] via-primary to-[#00a8cc]",
            "shadow-[0_30px_90px_-24px_rgba(45,127,249,0.55)]",
          )}
        >
          <div className="relative overflow-hidden rounded-[calc(1.75rem-1px)] bg-[rgba(5,10,20,0.93)] px-8 py-14 sm:px-14 sm:py-16">
            {/* Cinematic gradient veil. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 85% 40%, rgba(45,127,249,0.35), transparent 50%), radial-gradient(ellipse 50% 50% at 12% 100%, rgba(20,184,166,0.20), transparent 55%)",
              }}
            />
            {/* Faint iPhone silhouette behind the right column. */}
            <DeviceSilhouette className="pointer-events-none absolute -right-12 -top-8 hidden h-[120%] w-auto opacity-[0.07] sm:block lg:opacity-[0.10]" />

            <div className="relative flex flex-col items-center gap-8 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
              <div className="max-w-xl">
                <h2 className="font-heading text-[2.1rem] font-bold leading-[1.04] tracking-tight text-foreground sm:text-[2.6rem]">
                  {c.title}
                </h2>
                <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {c.description}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 lg:justify-end">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-white px-8 font-semibold text-[#050a14] shadow-[0_12px_40px_-10px_rgba(255,255,255,0.45)] hover:bg-white/95"
                  asChild
                >
                  <MarketingDestinationLink
                    href="/download"
                    className="inline-flex items-center gap-2"
                    analyticsSource="home_bottom_primary"
                  >
                    {c.primaryLabel}
                    <ArrowRight className="h-5 w-5" aria-hidden />
                  </MarketingDestinationLink>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-white/25 bg-transparent px-7 font-semibold text-foreground hover:bg-white/[0.06]"
                  asChild
                >
                  <MarketingDestinationLink href="/contact" analyticsSource="home_bottom_secondary">
                    {c.secondaryLabel}
                  </MarketingDestinationLink>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeviceSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 440"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      aria-hidden
      className={className}
    >
      <rect x="6" y="6" width="208" height="428" rx="40" ry="40" />
      <rect x="22" y="22" width="176" height="396" rx="28" ry="28" />
      <rect x="86" y="22" width="48" height="14" rx="7" ry="7" />
    </svg>
  );
}
