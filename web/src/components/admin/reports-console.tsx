"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import type { ReportRow } from "@/types/admin";

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <AdminFilterChip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </AdminFilterChip>
        ))}
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
              {filtered.map((r) => (
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
                      <Link href={`/admin/moderation?report=${encodeURIComponent(r.id)}`}>
                        Open
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
