import Link from "next/link";

import { AdminOpsStrip } from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCount } from "@/lib/admin/format";
import { loadBrandSafetySnapshot } from "@/lib/admin/queries";

export default async function AdminBrandSafetyPage() {
  const snap = await loadBrandSafetySnapshot();
  const { moderation: mod, reportOutcome } = snap;
  const resolvedDenom = reportOutcome.actionTaken + reportOutcome.dismissed;
  const upheldPct = resolvedDenom > 0 ? ((reportOutcome.actionTaken / resolvedDenom) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Trust & safety", href: "/admin/moderation" },
          { label: "Brand safety" },
        ]}
        title="Brand safety · advertiser confidence"
        description="Aggregated moderation signals for commercial storytelling — no reporter identities, no raw content payloads."
      />

      <AdminOpsStrip
        className="xl:grid-cols-4"
        items={[
          { label: "Open reports", value: formatCount(mod.open), hint: "pending queue" },
          { label: "Critical open", value: formatCount(mod.critical), hint: "high-risk reasons" },
          { label: "Avg resolution (sample)", value: formatHours(mod.avgResolutionHours), hint: "closed reports" },
          { label: "Appeals open", value: formatCount(snap.appealsOpen), hint: "content_appeals" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Report outcomes (lifetime counts)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Pulled from latest row totals — not window-normalized against content volume.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground/90">Action taken:</span> {formatCount(reportOutcome.actionTaken)}{" "}
              · <span className="text-foreground/90">Dismissed:</span> {formatCount(reportOutcome.dismissed)}
            </p>
            <p>
              <span className="text-foreground/90">Action taken share</span> (of closed outcomes in counts above):{" "}
              <span className="font-semibold tabular-nums text-foreground">{upheldPct}%</span>
            </p>
            <p className="text-xs">
              Content-volume-normalized report rate needs a scheduled rollup —{" "}
              <span className="text-foreground/85">not instrumented</span> in this view yet.
            </p>
          </CardContent>
        </AdminPanelCard>

        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Live ops (24h)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Non-terminal stream rows in the rolling window:{" "}
              <span className="font-semibold tabular-nums text-foreground">{snap.liveNonTerminalStreams24h}</span>
            </p>
            <p className="mt-2 text-xs">
              See <Link href="/admin/live">Live</Link> for session detail — this tile is only a coarse safety pulse.
            </p>
          </CardContent>
        </AdminPanelCard>
      </div>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Reports filed (30d trend)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Exact 30d headline count: <span className="tabular-nums text-foreground">{snap.reportsCreated30d}</span>.
            Daily buckets sample up to 4k rows — when volume exceeds the cap, late-month buckets under-count.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day (UTC)</TableHead>
                <TableHead className="text-right">Reports (sample)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snap.reportsLast30dByDay.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="tabular-nums text-muted-foreground">{row.date}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Appeals (30d)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Closed appeals (approved/rejected/denied/accepted) in the last 30 days:{" "}
          <span className="font-semibold tabular-nums text-foreground">{snap.appealsClosed30d}</span>. Overturn-rate
          analytics need structured outcome enums — treat this as volume-only until appeals outcomes are normalized.
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}

function formatHours(h: number | null): string {
  if (h == null || !Number.isFinite(h)) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}
