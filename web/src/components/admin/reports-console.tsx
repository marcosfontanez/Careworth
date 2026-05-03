"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AdminFilterChip } from "@/components/admin/admin-filter-chip";
import { StatusBadge } from "@/components/admin/status-badge";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { csvEscape } from "@/lib/admin/csv";
import type { ReportRow } from "@/types/admin";

const REPORT_CSV_HEADER = [
  "id",
  "type",
  "target_id",
  "reason",
  "severity",
  "status",
  "reporter_id",
  "reporter_name",
  "subject_display_name",
  "preview",
  "details",
  "staff_notes",
  "created_at",
] as const;

function reportsToCsv(rows: ReportRow[]): string {
  const lines = [REPORT_CSV_HEADER.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.id),
        csvEscape(r.type),
        csvEscape(r.targetId),
        csvEscape(r.reason),
        csvEscape(r.severity),
        csvEscape(r.status),
        csvEscape(r.reporterId),
        csvEscape(r.reporterName),
        csvEscape(r.subjectDisplayName),
        csvEscape(r.preview),
        csvEscape(r.details),
        csvEscape(r.staffNotes ?? ""),
        csvEscape(r.createdAt),
      ].join(","),
    );
  }
  return lines.join("\n");
}

type ReportFilter = "all" | ReportRow["status"] | "critical";

const FILTERS: { key: ReportFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "under_review", label: "Under review" },
  { key: "resolved", label: "Resolved" },
  { key: "critical", label: "Critical only" },
];

export function ReportsConsole({ reports }: { reports: ReportRow[] }) {
  const [filter, setFilter] = useState<ReportFilter>("all");

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (filter === "all") return true;
      if (filter === "critical") return r.severity === "critical";
      return r.status === filter;
    });
  }, [reports, filter]);

  const downloadCsv = useCallback(() => {
    const csv = reportsToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
    a.href = url;
    a.download = `pulseverse-reports-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <AdminFilterChip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </AdminFilterChip>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full shrink-0 sm:w-auto"
          onClick={downloadCsv}
          disabled={filtered.length === 0}
          title="Exports the currently filtered rows only"
        >
          Export CSV
        </Button>
      </div>
      <AdminPanelCard>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>All reports</CardTitle>
          <p className="text-xs text-muted-foreground">{filtered.length} shown · live data</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length ? (
                filtered.map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell className="capitalize">{r.type.replace("_", " ")}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{r.preview}</TableCell>
                    <TableCell className="capitalize text-sm text-muted-foreground">
                      {r.reason.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.severity} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/moderation?report=${encodeURIComponent(r.id)}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No reports match this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
