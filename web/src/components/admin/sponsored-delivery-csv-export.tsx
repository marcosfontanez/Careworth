"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  deliveryReportCsvString,
  toDeliveryReportCsvRow,
  type CampaignDeliveryReportRow,
} from "@/lib/sponsored-delivery-reporting-shared";

export function SponsoredDeliveryCsvExport({ rows }: { rows: CampaignDeliveryReportRow[] }) {
  function download() {
    const csv = deliveryReportCsvString(rows.map(toDeliveryReportCsvRow));
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseverse-sponsored-delivery-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" size="sm" className="border-white/15 bg-transparent" onClick={download}>
      <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
      Export delivery CSV ({rows.length})
    </Button>
  );
}
