"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

export type DashboardExportSnapshot = {
  exportedAt: string;
  kpis: { key: string; label: string; value: string; delta?: string }[];
  counts: {
    users: number;
    dau24h: number;
    liveSessions: number;
    openReports: number;
    pendingAppeals: number;
    circles: number;
    posts: number;
    comments: number;
  };
  notes: string;
};

export function DashboardExportButton({ snapshot }: { snapshot: DashboardExportSnapshot }) {
  const stamp = snapshot.exportedAt.slice(0, 19).replace(/[:T]/g, "-");

  function download() {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseverse-admin-dashboard-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" size="sm" className="border-white/15 bg-transparent" onClick={download}>
      <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
      Export snapshot
    </Button>
  );
}
