import Link from "next/link";

import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminActionQueueItem } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

const toneClass: Record<AdminActionQueueItem["tone"], string> = {
  default: "border-white/10 bg-secondary/20",
  warning: "border-amber-500/30 bg-amber-500/10",
  danger: "border-red-500/30 bg-red-500/10",
};

export function AdminActionQueuePanel({ items }: { items: AdminActionQueueItem[] }) {
  return (
    <AdminPanelCard>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Today&apos;s action queue</CardTitle>
        <p className="text-xs text-muted-foreground">Quick links to queues that need staff attention.</p>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "rounded-lg border px-3 py-2.5 transition hover:border-primary/40 hover:bg-primary/5",
              toneClass[item.tone],
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{item.count.toLocaleString()}</p>
          </Link>
        ))}
      </CardContent>
    </AdminPanelCard>
  );
}
