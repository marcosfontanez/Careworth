import Link from "next/link";
import { SectionHeader } from "@/components/marketing/section-header";
import { homePulseDuo } from "@/mock/marketing";
import { Button } from "@/components/ui/button";

export function HomePulseDuo() {
  const { eyebrow, title, pulsePage, myPulse, links } = homePulseDuo;
  return (
    <section className="border-y border-border/80 bg-pv-navy/25 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader eyebrow={eyebrow} title={title} />
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/80 bg-card/50 p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pulse Page</p>
            <p className="mt-4 text-muted-foreground leading-relaxed">{pulsePage}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card/50 p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-pv-aqua">My Pulse</p>
            <p className="mt-4 text-muted-foreground leading-relaxed">{myPulse}</p>
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
