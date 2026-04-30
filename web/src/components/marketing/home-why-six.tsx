import {
  Globe,
  HeartHandshake,
  Lock,
  Mic2,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import { getHomeWhySixCopy } from "@/lib/marketing-copy/home-why-six";
import { marketingGutterX } from "@/lib/ui-classes";

const icons: readonly LucideIcon[] = [
  Stethoscope,
  Lock,
  HeartHandshake,
  Mic2,
  Sparkles,
  Globe,
];

export function HomeWhySix({ locale }: { locale: Locale }) {
  const c = getHomeWhySixCopy(locale);

  return (
    <section className="py-20 sm:py-24">
      <div className={marketingGutterX}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{c.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{c.title}</h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {c.items.map((item, i) => {
            const Icon = icons[i] ?? Stethoscope;
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
