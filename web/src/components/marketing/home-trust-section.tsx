import { HeartHandshake, Lock, Quote, ShieldCheck, Stethoscope } from "lucide-react";

import {
  PremiumSectionHeader,
  TrustChip,
  WebsiteSectionBackdrop,
} from "@/components/marketing/website-visuals";
import type { Locale } from "@/lib/i18n";
import { getHomeTrustCopy } from "@/lib/marketing-copy/home-page-sections";
import { marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const ICONS = [Stethoscope, Lock, ShieldCheck, HeartHandshake] as const;

export function HomeTrustSection({ locale }: { locale: Locale }) {
  const c = getHomeTrustCopy(locale);

  return (
    <section className="relative isolate border-t border-white/5 py-20 sm:py-24">
      <WebsiteSectionBackdrop variant="soft" />
      <div className={marketingGutterX}>
        <PremiumSectionHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {c.commitments.map((item, i) => (
            <TrustChip key={item.title} icon={ICONS[i] ?? ShieldCheck} title={item.title} body={item.body} />
          ))}
        </div>

        {/* Single anchor quote — premium, centered, with brand mark instead of three competing cards. */}
        <figure
          className={cn(
            "relative mx-auto mt-14 max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.55)] p-8 ring-1 ring-white/[0.04] backdrop-blur-md sm:p-10",
            "shadow-[0_24px_70px_-30px_rgba(20,184,166,0.35)]",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(255,255,255,0.05),transparent_55%)]"
          />
          <Quote
            className="absolute left-6 top-6 h-8 w-8 text-[var(--accent)]/35 sm:left-8 sm:top-8"
            aria-hidden
          />
          <blockquote className="relative pl-12 sm:pl-14">
            <p className="text-pretty text-lg font-medium leading-relaxed text-foreground sm:text-xl">
              &ldquo;{c.voice.quote}&rdquo;
            </p>
            <figcaption className="mt-5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {c.voice.role}
            </figcaption>
          </blockquote>
        </figure>

        <p className="mt-6 text-center text-xs text-muted-foreground/80">{c.disclaimer}</p>
      </div>
    </section>
  );
}
