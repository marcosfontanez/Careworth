import { MarketingPrimaryCta, MarketingSecondaryCta } from "@/components/marketing/marketing-cta";
import { marketingGradientFrame, marketingGradientFrameInner, marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

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
    <section className="py-12 sm:py-16">
      <div className={marketingGutterX}>
        <div className={marketingGradientFrame}>
          <div className={cn(marketingGradientFrameInner, "px-6 py-10 sm:px-12 sm:py-12")}>
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
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                  {title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
              </div>
              <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center lg:mt-0 lg:justify-end">
                <MarketingPrimaryCta
                  href={primaryHref}
                  analyticsSource={analyticsScope ? `${analyticsScope}_primary` : undefined}
                >
                  {primaryLabel}
                </MarketingPrimaryCta>
                {secondaryHref && secondaryLabel ? (
                  <MarketingSecondaryCta
                    href={secondaryHref}
                    analyticsSource={analyticsScope ? `${analyticsScope}_secondary` : undefined}
                  >
                    {secondaryLabel}
                  </MarketingSecondaryCta>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
