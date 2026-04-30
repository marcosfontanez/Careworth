"use client";

import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InsightsKpiGrid({
  items,
}: {
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((k) => (
        <AdminPanelCard key={k.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-semibold tabular-nums tracking-tight">{k.value}</p>
            {k.hint ? <p className="text-[10px] leading-snug text-muted-foreground">{k.hint}</p> : null}
          </CardContent>
        </AdminPanelCard>
      ))}
    </div>
  );
}
