"use client";

import Image from "next/image";

import type { SponsorSafeReport } from "@/lib/sponsored-delivery-reporting-shared";
import { formatCount } from "@/lib/admin/format";

type Props = {
  report: SponsorSafeReport;
  generatedAt?: string;
};

export function SponsorSafeReportView({ report, generatedAt }: Props) {
  return (
    <article className="sponsor-safe-report mx-auto max-w-3xl space-y-8 rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.92)] p-8 print:border-none print:bg-white print:text-black">
      <header className="space-y-2 border-b border-white/10 pb-6 print:border-black/20">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/80 print:text-black/60">
          PulseVerse · Sponsored placement summary
        </p>
        <h1 className="text-2xl font-bold text-white print:text-black">{report.campaignName}</h1>
        <p className="text-sm text-white/70 print:text-black/70">{report.advertiserName}</p>
        {generatedAt ? (
          <p className="text-xs text-white/45 print:text-black/50">
            Generated {new Date(generatedAt).toLocaleString()}
          </p>
        ) : null}
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Metric label="Flight dates" value={`${report.flightStart} → ${report.flightEnd}`} />
        <Metric label="Placement" value={report.placementSummary} />
        <Metric label="Impressions" value={formatCount(report.impressions)} />
        <Metric label="Clicks" value={formatCount(report.clicks)} />
        <Metric label="CTR" value={`${report.ctr.toFixed(2)}%`} />
        <Metric
          label="Last delivered"
          value={report.lastDeliveredAt ? new Date(report.lastDeliveredAt).toLocaleString() : "—"}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/90 print:text-black">Creative</h2>
        <div className="flex gap-4">
          {report.creativePreview.mediaUrl ? (
            <div className="relative h-28 w-44 shrink-0 overflow-hidden rounded-xl border border-white/10 print:border-black/20">
              <Image
                src={report.creativePreview.mediaUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : null}
          <div className="text-sm text-white/75 print:text-black/80">
            <p className="font-semibold text-white print:text-black">{report.creativePreview.headline}</p>
            <p className="mt-2">{report.creativePreview.description}</p>
            {report.cta ? (
              <p className="mt-3 text-cyan-200 print:text-black">
                CTA: {report.cta.label}
                {report.cta.url ? ` (${report.cta.url})` : ""}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 pt-4 text-xs text-white/55 print:border-black/20 print:text-black/60">
        <p>{report.disclosureNote}</p>
        <p className="mt-2">Aggregate lifetime metrics · no user-level data included.</p>
      </footer>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 print:border-black/15 print:bg-transparent">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45 print:text-black/50">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/90 print:text-black">{value}</p>
    </div>
  );
}
