import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marketingGutterX } from "@/lib/ui-classes";

export function CtaSection({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  analyticsScope,
}: {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  /** Prefix for `marketing_cta_click` on /download and /contact only (_primary / _secondary). */
  analyticsScope?: string;
}) {
  return (
    <section className="py-16 sm:py-20">
      <div className={marketingGutterX}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c1f4a] via-primary to-[#00a8cc] p-px shadow-[0_24px_80px_-24px_rgba(45,127,249,0.45)]">
          <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-[rgba(5,10,20,0.93)] px-8 py-12 sm:px-14 sm:py-14">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 85% 40%, rgba(45,127,249,0.35), transparent 50%)",
              }}
              aria-hidden
            />
            <div className="relative flex flex-col items-center text-center lg:flex-row lg:justify-between lg:text-left">
              <div className="max-w-xl">
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h2>
                <p className="mt-3 text-lg text-muted-foreground">{description}</p>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:mt-0 lg:justify-end">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-white px-8 font-semibold text-[#050a14] hover:bg-white/90"
                  asChild
                >
                  <MarketingDestinationLink
                    href={primaryHref}
                    className="inline-flex items-center gap-2"
                    analyticsSource={analyticsScope ? `${analyticsScope}_primary` : undefined}
                  >
                    {primaryLabel}
                    <ArrowRight className="h-5 w-5" aria-hidden />
                  </MarketingDestinationLink>
                </Button>
                {secondaryHref && secondaryLabel && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-white/25 bg-transparent px-7 font-semibold text-foreground hover:bg-white/5"
                    asChild
                  >
                    <MarketingDestinationLink
                      href={secondaryHref}
                      analyticsSource={analyticsScope ? `${analyticsScope}_secondary` : undefined}
                    >{secondaryLabel}</MarketingDestinationLink>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
