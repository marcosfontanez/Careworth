"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MoreHorizontal } from "lucide-react";

import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import type { ReportReason, ReportRow, ReportStatus, Severity } from "@/types/admin";
import { cn } from "@/lib/utils";

function formatReportId(id: string): string {
  return `#RPT-${id.replace(/^r/i, "").toUpperCase()}`;
}

function formatReason(reason: ReportReason): string {
  return reason.replace(/_/g, " ");
}

function formatStatusLabel(status: ReportStatus): string {
  switch (status) {
    case "under_review":
      return "In review";
    case "pending":
      return "New";
    default:
      return status.replace(/_/g, " ");
  }
}

function timeShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const reasonTone: Partial<Record<ReportReason, string>> = {
  misinformation: "border-violet-500/35 bg-violet-500/15 text-violet-200",
  harassment: "border-red-500/35 bg-red-500/15 text-red-200",
  spam: "border-emerald-500/35 bg-emerald-500/15 text-emerald-200",
  unsafe_medical: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  potential_phi: "border-rose-500/40 bg-rose-500/15 text-rose-100",
  live_incident: "border-orange-500/40 bg-orange-500/15 text-orange-100",
};

const severityDisplay: Record<Severity, string> = {
  critical: "High",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function ModerationConsole({ reports }: { reports: ReportRow[] }) {
  const [selectedId, setSelectedId] = useState(reports[0]?.id ?? "");

  const selected = useMemo(() => reports.find((r) => r.id === selectedId) ?? reports[0], [reports, selectedId]);

  if (!selected) {
    return <p className="text-sm text-muted-foreground">No reports in queue.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
      <AdminPanelCard className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base">Reports queue</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{reports.length} open · mock data</p>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="More">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Content</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Reporter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Priority</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => {
                const active = r.id === selected.id;
                const reasonCls = reasonTone[r.reason] ?? "border-white/15 bg-white/[0.06] text-muted-foreground";
                return (
                  <TableRow
                    key={r.id}
                    className={cn(
                      "cursor-pointer border-border transition-colors",
                      active ? "bg-primary/[0.12]" : "hover:bg-white/[0.04]",
                    )}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{formatReportId(r.id)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{r.preview}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize", reasonCls)}>
                        {formatReason(r.reason)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{r.reporterName}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status === "pending" ? "pending" : r.status} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          r.severity === "critical" || r.severity === "high" ? "text-red-400" : "text-amber-200/90",
                        )}
                      >
                        {severityDisplay[r.severity]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{timeShort(r.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex justify-center gap-1 border-t border-border pt-4 text-xs text-muted-foreground">
            <Button variant="ghost" size="sm" className="h-8 min-w-8 p-0">
              1
            </Button>
            <Button variant="ghost" size="sm" className="h-8 min-w-8 p-0">
              2
            </Button>
            <span className="px-2 py-1">…</span>
            <Button variant="ghost" size="sm" className="h-8 min-w-8 p-0">
              41
            </Button>
          </div>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard className="lg:col-span-2 lg:sticky lg:top-20">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {formatReportId(selected.id)}
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" aria-label="Open">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Posted in <span className="text-foreground/90">Circle: Cardiology Connect</span>
            </p>
          </div>
          <StatusBadge status={selected.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 ring-1 ring-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-[#0066ff]" />
                <div>
                <p className="text-sm font-semibold text-foreground">Dr. Alan Patel</p>
                <p className="text-xs text-muted-foreground">Verified · Physician</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-foreground/95">{selected.preview}</p>
            <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">♥ 128</span>
              <span className="flex items-center gap-1">💬 24</span>
              <span className="flex items-center gap-1">↗ 6</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button className="bg-emerald-600/90 text-white hover:bg-emerald-600">Approve</Button>
            <Button variant="secondary" className="border border-white/10 bg-white/[0.06]">
              Remove content
            </Button>
            <Button variant="outline" className="border-amber-500/35 text-amber-100">
              Warn user
            </Button>
            <Button variant="destructive">Suspend user</Button>
          </div>

          <div>
            <label className="sr-only" htmlFor="mod-note">
              Internal note
            </label>
            <Textarea
              id="mod-note"
              placeholder="Add internal note…"
              className="min-h-[80px] border-white/10 bg-white/[0.04] text-sm placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            <span>
              Status: <strong className="font-medium text-foreground">{formatStatusLabel(selected.status)}</strong>
            </span>
            <span>·</span>
            <span>
              Reason: <strong className="font-medium text-foreground">{formatReason(selected.reason)}</strong>
            </span>
            <span>·</span>
            <span>
              Subject: <strong className="font-medium text-foreground">{selected.subjectName}</strong>
            </span>
          </div>
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
