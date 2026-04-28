import { Globe2, Users, Radio, Heart } from "lucide-react";
import { marketingGutterX } from "@/lib/ui-classes";
import type { LucideIcon } from "lucide-react";

const stats: { label: string; value: string; icon: LucideIcon }[] = [
  { label: "Healthcare professionals", value: "850K+", icon: Users },
  { label: "Countries", value: "190+", icon: Globe2 },
  { label: "Active Circles", value: "25K+", icon: Heart },
  { label: "Live sessions hosted", value: "3.7K+", icon: Radio },
];

export function HomeStatsSplit() {
  return (
    <section className="border-t border-[rgba(148,163,184,0.08)] py-20 sm:py-24">
      <div className={marketingGutterX}>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
              A community that{" "}
              <span className="bg-gradient-to-r from-primary to-[var(--accent)] bg-clip-text text-transparent">cares.</span>{" "}
              A network that{" "}
              <span className="bg-gradient-to-r from-primary to-[var(--accent)] bg-clip-text text-transparent">
                empowers.
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              CareWorth grows where clinicians already show up — with rooms, live moments, and profiles worth revisiting.
            </p>
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
