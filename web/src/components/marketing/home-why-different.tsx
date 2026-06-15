import { PremiumSectionHeader } from "@/components/marketing/website-visuals";
import type { HomeLandingCopy } from "@/lib/marketing-copy/home-landing";
import { marketingGutterX, marketingSection } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type Props = { copy: HomeLandingCopy["whyDifferent"] };

export function HomeWhyDifferent({ copy }: Props) {
  return (
    <section className={marketingSection}>
      <div className={marketingGutterX}>
        <PremiumSectionHeader eyebrow={copy.eyebrow} title={copy.title} align="center" />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {copy.cards.map((card) => (
            <li
              key={card.title}
              className={cn(
                "rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.65)] p-6 ring-1 ring-white/4",
                "shadow-[0_24px_70px_-30px_rgba(20,184,166,0.25)] transition duration-200 hover:border-accent/30",
              )}
            >
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
