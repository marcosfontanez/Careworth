import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/marketing/section-header";
import { homeFeatureSpotlights } from "@/mock/marketing";

export function HomeSpotlightSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="Feature spotlight"
          title="Feed, Circles, Live, Pulse Page — where culture lives."
          description="Discovery, premium topic rooms, real-time Live, and a creator-grade Pulse Page with My Pulse and Media Hub — without flattening you into a badge."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {homeFeatureSpotlights.map((s) => (
            <Link
              key={s.tag}
              href={s.href}
              className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/40 p-6 transition hover:border-primary/35 hover:shadow-[0_20px_60px_-28px_rgba(37,99,235,0.35)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-pv-electric/5 opacity-0 transition group-hover:opacity-100" />
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{s.tag}</p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Learn more
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
