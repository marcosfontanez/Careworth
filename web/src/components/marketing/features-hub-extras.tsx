import { Check, Globe, Orbit, Radio, Users } from "lucide-react";

import { marketingGutterX, marketingEyebrow, marketingCardMuted, marketingSectionTitle } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { featuresComparisonRows, featuresHubStatsBar } from "@/mock/marketing";

const statIcons = [Users, Globe, Orbit, Radio] as const;

export function FeaturesHubStatsBar() {
  return (
    <div className={cn(marketingGutterX, "py-10")}>
      <div className="grid gap-6 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 ring-1 ring-white/[0.05] sm:grid-cols-2 lg:grid-cols-4">
        {featuresHubStatsBar.map((s, i) => {
          const Icon = statIcons[i] ?? Users;
          return (
            <div key={s.label} className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Cell({ variant }: { variant: "full" | "partial" | "no" | "limited" }) {
  if (variant === "full") {
    return (
      <div className="flex justify-center">
        <Check className="h-5 w-5 text-[var(--accent)]" strokeWidth={2.5} aria-label="Included" />
      </div>
    );
  }
  if (variant === "partial" || variant === "limited") {
    return <p className="text-center text-xs font-medium text-muted-foreground">Limited</p>;
  }
  return <p className="text-center text-sm text-muted-foreground/70">—</p>;
}

export function FeaturesComparisonSection() {
  return (
    <div className={cn(marketingGutterX, "py-16")}>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
        <div>
          <p className={marketingEyebrow}>Compare</p>
          <h2 className={cn(marketingSectionTitle, "mt-2")}>More than a platform. A better way to connect.</h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            CareWorth is built for the cultural layer clinicians never had — not consumer social glued to a
            directory.
          </p>
        </div>
        <div className={cn("rounded-2xl p-6 sm:p-8", marketingCardMuted)}>
          <h3 className="text-center text-lg font-bold text-foreground">Why CareWorth stands out</h3>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground" />
                  <th className="w-24 pb-2 text-center text-xs font-semibold text-[var(--accent)]">CareWorth</th>
                  <th className="w-24 pb-2 text-center text-xs font-semibold text-muted-foreground">Others</th>
                </tr>
              </thead>
              <tbody>
                {featuresComparisonRows.map((row) => (
                  <tr key={row.label} className="border-b border-white/[0.06]">
                    <td className="py-3 pr-4 text-muted-foreground">{row.label}</td>
                    <td className="py-3">
                      <Cell variant={row.us} />
                    </td>
                    <td className="py-3">
                      <Cell variant={row.them} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
