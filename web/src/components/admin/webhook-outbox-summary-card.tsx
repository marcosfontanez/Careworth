import Link from "next/link";

import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WebhookOutboxSummary } from "@/lib/admin/webhook-outbox";
import { cn } from "@/lib/utils";

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function fmtAge(ms: number | null): string {
  if (ms == null) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function WebhookOutboxSummaryCard({
  summary,
  compact = false,
}: {
  summary: WebhookOutboxSummary;
  compact?: boolean;
}) {
  const stats = [
    { label: "Pending", value: summary.pending, tone: "text-foreground" },
    { label: "Failed", value: summary.failed, tone: summary.failed > 0 ? "text-amber-200" : "text-foreground" },
    { label: "Delivered", value: summary.delivered, tone: "text-emerald-200" },
    { label: "Retrying", value: summary.retrying, tone: "text-blue-200" },
    { label: "Ignored", value: summary.ignored, tone: "text-muted-foreground" },
  ];

  return (
    <AdminPanelCard>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Webhook outbox</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{summary.workerNote}</p>
        </div>
        <Link
          href="/admin/platform/webhooks"
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Open full console →
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn("grid gap-3", compact ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-5")}>
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-white/8 bg-secondary/15 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className={cn("mt-1 text-xl font-semibold tabular-nums", s.tone)}>{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <p>
            <span className="font-medium text-foreground/90">Oldest pending:</span>{" "}
            {fmtAge(summary.oldestPendingAgeMs)}
            {summary.stalePending > 0 ? (
              <Link href="/admin/platform/webhooks?status=pending&stale=1" className="ml-1 text-amber-200 underline">
                ({summary.stalePending} stale)
              </Link>
            ) : null}
          </p>
          <p>
            <span className="font-medium text-foreground/90">Last delivered:</span> {fmtTime(summary.lastDeliveredAt)}
          </p>
          <p>
            <span className="font-medium text-foreground/90">Last failed:</span> {fmtTime(summary.lastFailedAt)}
          </p>
          <p>
            <span className="font-medium text-foreground/90">Last attempt:</span> {fmtTime(summary.lastAttemptAt)}
          </p>
          <p>
            <span className="font-medium text-foreground/90">Worker run:</span> {fmtTime(summary.workerLastRunAt)}
            {summary.workerStatus !== "unknown" ? (
              <span className="ml-1 text-foreground/70">({summary.workerStatus.replace(/_/g, " ")})</span>
            ) : null}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Worker flag:{" "}
          <span className={summary.workerDeliveryEnabled ? "text-emerald-200" : "text-amber-200"}>
            webhook_delivery {summary.workerDeliveryEnabled ? "enabled" : "disabled"}
          </span>
          <span className="mx-2 text-border">·</span>
          Active destinations:{" "}
          <span className={summary.activeDestinations > 0 ? "text-foreground/90" : "text-amber-200"}>
            {summary.activeDestinations}
          </span>
        </p>

        {!compact && summary.failed > 0 ? (
          <Link
            href="/admin/platform/webhooks?status=failed"
            className="inline-flex text-xs font-medium text-amber-200 underline-offset-2 hover:underline"
          >
            Review {summary.failed} failed {summary.failed === 1 ? "event" : "events"} →
          </Link>
        ) : null}
      </CardContent>
    </AdminPanelCard>
  );
}
