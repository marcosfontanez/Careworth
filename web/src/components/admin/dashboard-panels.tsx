import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AdminOpsStrip({
  items,
  className,
}: {
  items: { label: string; value: string; hint?: string }[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border/80 bg-gradient-to-br from-card/90 to-secondary/25 px-4 py-3 shadow-sm ring-1 ring-white/[0.04]"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{item.value}</p>
          {item.hint ? <p className="mt-1 text-xs leading-snug text-muted-foreground">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

function formatShortAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function RecentActivityList({
  items,
}: {
  items: { id: string; summary: string; actor: string; at: string }[];
}) {
  return (
    <AdminPanelCard>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={cn(
              "flex gap-3 py-3 text-sm",
              i < items.length - 1 && "border-b border-border/80",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-foreground">{item.summary}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.actor} · {formatShortAgo(item.at)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </AdminPanelCard>
  );
}

const pipelineTone: Record<string, string> = {
  pending: "bg-amber-500/80",
  under_review: "bg-sky-500/80",
  resolved: "bg-primary/70",
};

export function ReportPipelineSummary({
  items,
}: {
  items: { status: string; count: number }[];
}) {
  const total = items.reduce((a, b) => a + b.count, 0) || 1;
  return (
    <AdminPanelCard>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Report pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary ring-1 ring-white/[0.04]">
          {items.map((s) => (
            <div
              key={s.status}
              title={`${s.status}: ${s.count}`}
              className={cn(
                "min-w-px transition-all",
                pipelineTone[s.status] ?? "bg-muted-foreground/40",
              )}
              style={{ width: `${(s.count / total) * 100}%` }}
            />
          ))}
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          {items.map((s) => (
            <div key={s.status} className="rounded-lg bg-secondary/30 px-3 py-2 ring-1 ring-white/[0.03]">
              <dt className="text-xs capitalize text-muted-foreground">{s.status.replace(/_/g, " ")}</dt>
              <dd className="text-lg font-semibold tabular-nums">{s.count.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </AdminPanelCard>
  );
}

export function SystemHealthChecklist({
  services,
}: {
  services: { name: string; status: "operational" | "degraded" | "down" }[];
}) {
  return (
    <AdminPanelCard>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">System health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {services.map((s) => (
          <div
            key={s.name}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm"
          >
            <span className="text-foreground">{s.name}</span>
            <span
              className={cn(
                "text-xs font-medium capitalize",
                s.status === "operational" ? "text-emerald-400" : "text-amber-300",
              )}
            >
              {s.status}
            </span>
          </div>
        ))}
      </CardContent>
    </AdminPanelCard>
  );
}

export function ModeratorWorkloadPanel({
  moderators,
}: {
  moderators: { id: string; name: string; load: number }[];
}) {
  return (
    <AdminPanelCard>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Active moderators</CardTitle>
        <p className="text-xs text-muted-foreground">Workload overview · mock</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {moderators.map((m) => (
          <div key={m.id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{m.name}</span>
              <span className="tabular-nums text-muted-foreground">{m.load}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary ring-1 ring-white/[0.04]">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-primary to-[#00d2ff]",
                  m.load > 80 && "from-amber-500 to-orange-400",
                )}
                style={{ width: `${m.load}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </AdminPanelCard>
  );
}
