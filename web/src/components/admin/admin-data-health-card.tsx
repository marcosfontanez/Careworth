import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminDataHealthSnapshot } from "@/lib/admin/admin-data-health";
import { cn } from "@/lib/utils";

export function AdminDataHealthCard({ health }: { health: AdminDataHealthSnapshot }) {
  const ok = health.aggregatesHealth === "healthy" && health.serviceRoleConfigured;

  return (
    <AdminPanelCard>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Admin data health</CardTitle>
        <p className="text-xs text-muted-foreground">Internal ops signal — never exposes secrets.</p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-secondary/20 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Service role configured</p>
          <p className={cn("mt-1 font-semibold", health.serviceRoleConfigured ? "text-emerald-400" : "text-amber-400")}>
            {health.serviceRoleConfigured ? "Yes" : "No"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-secondary/20 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Admin data mode</p>
          <p className="mt-1 font-semibold">{health.accessMode === "service_role" ? "Service role" : "Session RLS fallback"}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-secondary/20 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Aggregates health</p>
          <p className={cn("mt-1 font-semibold", ok ? "text-emerald-400" : "text-amber-400")}>
            {health.aggregatesHealth === "healthy" ? "Healthy" : "Degraded"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-secondary/20 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Last successful query</p>
          <p className="mt-1 text-sm font-medium">
            {health.lastSuccessfulQueryAt ? new Date(health.lastSuccessfulQueryAt).toLocaleString() : "—"}
          </p>
        </div>
        {health.rlsFallbackWarning ? (
          <p className="sm:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
            {health.rlsFallbackWarning}
          </p>
        ) : null}
      </CardContent>
    </AdminPanelCard>
  );
}
