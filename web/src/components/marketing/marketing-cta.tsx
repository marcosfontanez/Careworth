import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { Button } from "@/components/ui/button";
import { marketingCtaPrimaryClasses, marketingCtaSecondaryClasses } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type MarketingCtaProps = {
  href: string;
  children: ReactNode;
  className?: string;
  analyticsSource?: string;
  showArrow?: boolean;
};

/** Primary marketing CTA — gradient pill, consistent across homepage and hub pages. */
export function MarketingPrimaryCta({
  href,
  children,
  className,
  analyticsSource,
  showArrow = true,
}: MarketingCtaProps) {
  return (
    <Button size="lg" className={cn(marketingCtaPrimaryClasses, className)} asChild>
      <MarketingDestinationLink
        href={href}
        analyticsSource={analyticsSource}
        className="group/cta inline-flex items-center justify-center gap-2"
      >
        {children}
        {showArrow ? (
          <ArrowRight
            className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-1 sm:h-5 sm:w-5"
            aria-hidden
          />
        ) : null}
      </MarketingDestinationLink>
    </Button>
  );
}

/** Secondary marketing CTA — glass outline pill. */
export function MarketingSecondaryCta({
  href,
  children,
  className,
  analyticsSource,
  showArrow = false,
}: MarketingCtaProps) {
  return (
    <Button size="lg" variant="outline" className={cn(marketingCtaSecondaryClasses, className)} asChild>
      <MarketingDestinationLink
        href={href}
        analyticsSource={analyticsSource}
        className="inline-flex items-center justify-center gap-2"
      >
        {children}
        {showArrow ? <ArrowRight className="h-4 w-4 shrink-0" aria-hidden /> : null}
      </MarketingDestinationLink>
    </Button>
  );
}

/** Internal route link styled as secondary CTA (no analytics wrapper). */
export function MarketingSecondaryLink({
  href,
  children,
  className,
  prefetch,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  /** Pass `false` for heavy app routes (e.g. /web-app) to skip background prefetch. */
  prefetch?: boolean;
}) {
  return (
    <Button size="lg" variant="outline" className={cn(marketingCtaSecondaryClasses, className)} asChild>
      <Link href={href} prefetch={prefetch} className="inline-flex items-center justify-center gap-2">
        {children}
      </Link>
    </Button>
  );
}
