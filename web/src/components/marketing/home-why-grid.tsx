import { Shield, Sparkles, Layers, type LucideIcon } from "lucide-react";
import { SectionHeader } from "@/components/marketing/section-header";
import { homeWhyCards } from "@/mock/marketing";
import { marketingGutterX } from "@/lib/ui-classes";

const icons: LucideIcon[] = [Shield, Sparkles, Layers];

export function HomeWhyGrid() {
  return (
    <section className="py-20 sm:py-24">
      <div className={marketingGutterX}>
        <SectionHeader
          eyebrow="Why PulseVerse"
          title="Checked your Pulse lately?"
          description="We’re building the cultural layer healthcare never had — not another enterprise directory."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {homeWhyCards.map((c, i) => {
            const Icon = icons[i] ?? Sparkles;
            return (
              <div
                key={c.title}
                className="rounded-2xl border border-border/80 bg-card/35 p-6 ring-1 ring-white/[0.03] transition duration-200 hover:border-primary/25"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
