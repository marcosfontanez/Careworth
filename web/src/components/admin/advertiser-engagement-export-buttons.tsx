"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildExternalAdvertiserCsv,
  buildExternalAdvertiserPayload,
  buildInternalAdvertiserCsv,
  buildInternalAdvertiserJsonEnvelope,
} from "@/lib/admin/advertiser-export-modes";
import type { AdvertiserEngagementPayload } from "@/types/advertiser-engagement";

export function AdvertiserEngagementExportButtons({ payload }: { payload: AdvertiserEngagementPayload }) {
  const stamp = new Date(payload.generatedAt).toISOString().slice(0, 19).replace(/[:T]/g, "-");

  function downloadExternalCsv() {
    const blob = new Blob([buildExternalAdvertiserCsv(payload)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseverse-advertiser-external-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadExternalJson() {
    const body = buildExternalAdvertiserPayload(payload);
    const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseverse-advertiser-external-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadInternalJson() {
    const body = buildInternalAdvertiserJsonEnvelope(payload);
    const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseverse-advertiser-internal-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadInternalCsv() {
    const blob = new Blob([buildInternalAdvertiserCsv(payload)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseverse-advertiser-internal-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/90">
          External-safe (default for sponsors)
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-emerald-500/35 bg-emerald-500/8"
            onClick={downloadExternalCsv}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-emerald-500/35 bg-emerald-500/8"
            onClick={downloadExternalJson}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            JSON
          </Button>
        </div>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
          Aggregates only · no post previews · no screen/event histograms · KPI hints stripped on JSON (methodology still
          documented via caps + notInstrumented fields).
        </p>
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
          Internal staff only
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="border-amber-500/35 bg-amber-500/8" onClick={downloadInternalCsv}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            CSV (full diagnostics)
          </Button>
          <Button type="button" variant="outline" size="sm" className="border-amber-500/35 bg-amber-500/8" onClick={downloadInternalJson}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            JSON (full payload)
          </Button>
        </div>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
          Includes top-post previews with creator display strings, raw analytics labels, and KPI hints. Do not forward to
          advertisers.
        </p>
      </div>
    </div>
  );
}
