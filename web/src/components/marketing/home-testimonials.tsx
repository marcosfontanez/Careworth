import { SectionHeader } from "@/components/marketing/section-header";
import { homeTestimonials } from "@/mock/marketing";

export function HomeTestimonials() {
  return (
    <section className="border-t border-border/80 bg-gradient-to-b from-transparent to-pv-navy/30 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="Social proof"
          title="Voices from the floor"
          description="Placeholders from pilot cohorts — swap for verified testimonials when you launch."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {homeTestimonials.map((t, i) => (
            <blockquote
              key={i}
              className="rounded-2xl border border-border/80 bg-card/45 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            >
              <p className="text-sm font-medium leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-4 text-xs text-muted-foreground">{t.role}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
