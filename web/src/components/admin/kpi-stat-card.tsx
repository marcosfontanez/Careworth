import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const accentBar = {
  primary: "from-primary/45 to-[#4d9fff]/30",
  accent: "from-[#00d2ff]/40 to-primary/25",
  violet: "from-violet-500/45 to-fuchsia-500/25",
  destructive: "from-rose-500/40 to-orange-400/20",
  amber: "from-amber-500/45 to-orange-400/25",
} as const;

export type KpiAccent = keyof typeof accentBar;

export function KpiStatCard({
  label,
  value,
  delta,
  trend,
  accent = "primary",
}: {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  accent?: KpiAccent;
}) {
  const barGradient = trend === "down" ? "from-destructive/35 to-destructive/10" : accentBar[accent];
  return (
    <AdminPanelCard>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        <p className={cn("mt-1 text-sm font-medium", trend === "up" ? "text-emerald-400/90" : "text-red-400/90")}>
          {delta}
        </p>
        <div className="mt-3 h-8 w-full rounded-md bg-secondary/50">
          <div className={cn("h-full w-[72%] rounded-md bg-gradient-to-r", barGradient)} />
        </div>
      </CardContent>
    </AdminPanelCard>
  );
}
