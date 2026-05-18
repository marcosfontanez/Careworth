"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CampaignRow } from "@/types/admin";

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function campaignsToCsv(rows: CampaignRow[]): string {
  const header =
    "id,sponsor,placement,status,start,end,impressions,clicks,ctr_pct,budget_total,budget_spent,pacing_note";
  const lines = [header];
  for (const c of rows) {
    lines.push(
      [
        csvEscape(c.id),
        csvEscape(c.sponsor),
        csvEscape(c.placement),
        csvEscape(c.status),
        csvEscape(c.start),
        csvEscape(c.end),
        c.impressions,
        c.clicks,
        c.ctr.toFixed(3),
        c.budgetTotal,
        c.budgetSpent,
        csvEscape(c.pacingNote ?? ""),
      ].join(","),
    );
  }
  return lines.join("\n");
}

export function CampaignListCsvExport({ rows }: { rows: CampaignRow[] }) {
  function download() {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const blob = new Blob([campaignsToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseverse-campaigns-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" size="sm" className="border-white/15 bg-transparent" onClick={download}>
      <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
      Export CSV ({rows.length})
    </Button>
  );
}
