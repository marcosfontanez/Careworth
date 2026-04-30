import { Globe2, Users, Radio, Heart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import { getHomeStatsSplitCopy } from "@/lib/marketing-copy/home-page-sections";
import { marketingGutterX } from "@/lib/ui-classes";

const statIcons: readonly LucideIcon[] = [Users, Globe2, Heart, Radio];

export function HomeStatsSplit({ locale }: { locale: Locale }) {
  const c = getHomeStatsSplitCopy(locale);
  const stats = c.statLabels.map((label, i) => ({
    label,
    value: (["850K+", "190+", "25K+", "3.7K+"] as const)[i] ?? "",
    icon: statIcons[i] ?? Users,
  }));

  return (
    <section className="border-t border-[rgba(148,163,184,0.08)] py-20 sm:py-24">
      <div className={marketingGutterX}>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
              {c.titleLead}{" "}
              <span className="bg-gradient-to-r from-primary to-[var(--accent)] bg-clip-text text-transparent">{c.titleCare}</span>{" "}
              {c.titleMid}{" "}
              <span className="bg-gradient-to-r from-primary to-[var(--accent)] bg-clip-text text-transparent">
                {c.titleEmpower}
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">{c.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="flex gap-4 rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[rgba(12,21,36,0.5)] p-5 ring-1 ring-white/[0.03]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{s.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
