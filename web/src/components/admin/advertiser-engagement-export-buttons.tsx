"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AdvertiserEngagementPayload } from "@/types/advertiser-engagement";

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function payloadToCsv(payload: AdvertiserEngagementPayload): string {
  const lines: string[] = [];
  lines.push("section,field,value");
  for (const k of payload.kpis) {
    const val = k.hint ? `${k.value} · ${k.hint}` : k.value;
    lines.push([csvEscape("kpi"), csvEscape(k.label), csvEscape(val)].join(","));
  }
  lines.push("");
  lines.push("date,events,estReachUsers,newPosts,newComments,newLikes,newShares,newBookmarks,newProfiles");
  for (const d of payload.daily) {
    lines.push(
      [d.date, d.events, d.estReachUsers, d.newPosts, d.newComments, d.newLikes, d.newShares, d.newBookmarks, d.newProfiles].join(
        ",",
      ),
    );
  }
  lines.push("");
  lines.push("period_metric,label,current,prior,change_pct");
  for (const r of payload.periodComparison.rows) {
    lines.push(`comparison,${csvEscape(r.label)},${r.current},${r.prior},${r.changePct}`);
  }
  lines.push("");
  lines.push("campaign,advertiser,impressions,clicks,ctr_pct,status");
  for (const c of payload.campaignLeaderboard) {
    lines.push(
      [
        csvEscape(c.title),
        csvEscape(c.advertiserName),
        c.impressions,
        c.clicks,
        c.ctrPct,
        csvEscape(c.status),
      ].join(","),
    );
  }
  return lines.join("\n");
}

export function AdvertiserEngagementExportButtons({ payload }: { payload: AdvertiserEngagementPayload }) {
  const stamp = new Date(payload.generatedAt).toISOString().slice(0, 19).replace(/[:T]/g, "-");

  function downloadCsv() {
    const blob = new Blob([payloadToCsv(payload)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseverse-engagement-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseverse-engagement-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" className="border-white/15 bg-transparent" onClick={downloadCsv}>
        <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Export CSV
      </Button>
      <Button type="button" variant="outline" size="sm" className="border-white/15 bg-transparent" onClick={downloadJson}>
        <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Export JSON
      </Button>
    </div>
  );
}
