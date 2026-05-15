import { Award, HeartPulse, ShieldCheck } from "lucide-react";

import { WebsiteSectionBackdrop } from "@/components/marketing/website-visuals";
import type { Locale } from "@/lib/i18n";
import { getHomeSignatureOverviewCopy } from "@/lib/marketing-copy/home-page-sections";
import { marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const ICONS = [ShieldCheck, HeartPulse, Award] as const;

export function HomeSignatureOverview({ locale }: { locale: Locale }) {
  const c = getHomeSignatureOverviewCopy(locale);

  return (
    <section
      className="relative isolate border-y border-white/[0.06] py-10 sm:py-12"
      aria-label="What makes it PulseVerse"
    >
      <WebsiteSectionBackdrop variant="soft" />
      <div className={marketingGutterX}>
        <p className="sr-only">{c.eyebrow}</p>
        {/* Single-row premium strip — replaces the previous 4-card pillar block. */}
        <ul
          className={cn(
            "grid gap-4 sm:gap-6",
            "grid-cols-1 sm:grid-cols-3",
            "rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.55)] p-5 ring-1 ring-white/[0.04] backdrop-blur-md sm:p-6",
            "shadow-[0_24px_70px_-30px_rgba(20,184,166,0.30)]",
          )}
        >
          {c.items.map((item, i) => {
            const Icon = ICONS[i] ?? HeartPulse;
            return (
              <li
                key={item.title}
                className={cn(
                  "flex items-center gap-3.5 rounded-xl px-2 py-1.5",
                  i !== 0 && "sm:border-l sm:border-white/[0.06] sm:pl-5",
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]/30">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight text-foreground">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.kicker}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
