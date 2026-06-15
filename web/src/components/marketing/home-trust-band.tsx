import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import { getHomeLandingCopy } from "@/lib/marketing-copy/home-landing";
import { marketingFocusRing, marketingGutterX, marketingInlineLink, marketingSection } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/** Compact trust / PHI band — visible before footer, not buried. */
export function HomeTrustBand({ locale }: { locale: Locale }) {
  const c = getHomeLandingCopy(locale).trustBand;

  return (
    <section className={cn(marketingSection, "border-t border-white/8 py-10 sm:py-12")}>
      <div className={marketingGutterX}>
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.55)] px-5 py-6 text-center ring-1 ring-white/4 sm:px-8">
          <ShieldCheck className="h-8 w-8 text-accent/90" aria-hidden />
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="font-semibold text-foreground">{c.phiLead}</strong> {c.phiBody}{" "}
            {c.links.map((l, i) => (
              <span key={l.href}>
                {i > 0 && i === c.links.length - 1 ? ", and " : i > 0 ? ", " : ""}
                <Link href={l.href} className={marketingInlineLink}>
                  {l.label}
                </Link>
              </span>
            ))}
            .
          </p>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground"
            aria-label="Trust and legal"
          >
            <Link href="/terms" className={cn(marketingInlineLink, marketingFocusRing, "text-xs")}>
              Terms
            </Link>
            <Link href="/child-safety" className={cn(marketingInlineLink, marketingFocusRing, "text-xs")}>
              Child safety
            </Link>
            <Link href="/faq" className={cn(marketingInlineLink, marketingFocusRing, "text-xs")}>
              FAQ
            </Link>
          </nav>
        </div>
      </div>
    </section>
  );
}
