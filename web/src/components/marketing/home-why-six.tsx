import {
  Globe,
  HeartHandshake,
  Lock,
  Mic2,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { marketingGutterX } from "@/lib/ui-classes";
import type { LucideIcon } from "lucide-react";

const items: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Stethoscope,
    title: "Healthcare first",
    body: "Surfaces and moderation tuned for licensed professionals — not generic social noise.",
  },
  {
    icon: Lock,
    title: "Privacy by design",
    body: "Built with PHI-shaped mistakes in mind — reporting flows that match clinical reality.",
  },
  {
    icon: HeartHandshake,
    title: "Meaningful community",
    body: "Circles and Live that honor night shift, humor, and hard conversations.",
  },
  {
    icon: Mic2,
    title: "Live & interactive",
    body: "Teaching, AMAs, and Q&A with tooling that scales when chat moves fast.",
  },
  {
    icon: Sparkles,
    title: "Your professional brand",
    body: "Pulse Page showcases how you show up — clips, pins, and credibility without stiffness.",
  },
  {
    icon: Globe,
    title: "Global reach",
    body: "A culture network spanning roles, regions, and training stages.",
  },
];

export function HomeWhySix() {
  return (
    <section className="py-20 sm:py-24">
      <div className={marketingGutterX}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Why CareWorth</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built by healthcare. Built for healthcare.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[rgba(12,21,36,0.45)] p-6 ring-1 ring-white/[0.03] backdrop-blur-sm transition hover:border-primary/25"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
