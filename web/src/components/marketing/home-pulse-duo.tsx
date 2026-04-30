import Link from "next/link";
import { SectionHeader } from "@/components/marketing/section-header";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { getHomePulseDuoCopy } from "@/lib/marketing-copy/home-page-sections";

export function HomePulseDuo({ locale }: { locale: Locale }) {
  const { eyebrow, title, pulsePageLabel, myPulseLabel, pulsePage, myPulse, links } = getHomePulseDuoCopy(locale);
  return (
    <section className="border-y border-border/80 bg-pv-navy/25 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader eyebrow={eyebrow} title={title} />
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/80 bg-card/50 p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{pulsePageLabel}</p>
            <p className="mt-4 leading-relaxed text-muted-foreground">{pulsePage}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card/50 p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-pv-aqua">{myPulseLabel}</p>
            <p className="mt-4 leading-relaxed text-muted-foreground">{myPulse}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {links.map((l) => (
            <Button key={l.href} variant="outline" className="border-primary/30" asChild>
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
