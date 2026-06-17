"use client";

import Image from "next/image";
import { AlertTriangle } from "lucide-react";

import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/admin/format";
import { DELIVERY_STATE_LABELS } from "@/lib/sponsored-delivery-reporting-shared";
import type { CampaignDeliveryReportRow } from "@/lib/sponsored-delivery-reporting-shared";
import { cn } from "@/lib/utils";

function toneForState(state: CampaignDeliveryReportRow["deliveryState"]) {
  if (state === "delivering") return "ok" as const;
  if (state === "eligible_flags_off") return "warn" as const;
  return "muted" as const;
}

type Props = {
  report: CampaignDeliveryReportRow;
  campaignStatus: string;
  mediaUrl: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
};

export function CampaignSponsoredPerformanceCard({
  report,
  campaignStatus,
  mediaUrl,
  description,
  ctaLabel,
  ctaUrl,
}: Props) {
  const tone = toneForState(report.deliveryState);
  const booking = report.primaryBooking;
  const warnings = [...report.creativeWarnings, ...report.ctaWarnings];

  return (
    <AdminPanelCard>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white/90">Sponsored performance</h3>
            <p className="mt-1 max-w-xl text-xs text-white/55">
              Lifetime counters from the campaign row. Session dedupe may undercount impressions vs raw views.
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border font-normal",
              tone === "ok" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
              tone === "warn" && "border-amber-500/30 bg-amber-500/10 text-amber-100",
              tone === "muted" && "border-white/15 bg-white/5 text-white/70",
            )}
          >
            {DELIVERY_STATE_LABELS[report.deliveryState]}
          </Badge>
        </div>

        <div className="grid gap-2 text-xs text-white/70 sm:grid-cols-3">
          <div>
            Campaign status: <span className="font-medium capitalize text-white/90">{campaignStatus}</span>
          </div>
          <div>
            Impressions: <span className="font-medium text-white/90">{formatCount(report.impressions)}</span>
          </div>
          <div>
            Clicks: <span className="font-medium text-white/90">{formatCount(report.clicks)}</span>
          </div>
          <div>
            CTR: <span className="font-medium text-white/90">{report.ctr.toFixed(2)}%</span>
          </div>
          <div>
            Last impression:{" "}
            {report.lastImpressionAt ? new Date(report.lastImpressionAt).toLocaleString() : "—"}
          </div>
          <div>
            Last click: {report.lastClickAt ? new Date(report.lastClickAt).toLocaleString() : "—"}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FlagRow label="sponsoredPosts" enabled={report.flags.sponsoredPostsEnabled} hint="Mobile session flag." />
          <FlagRow
            label="sponsoredPlacementDelivery"
            enabled={report.flags.mobilePlacementDeliveryEnabled}
            hint="Mobile session flag."
          />
          <FlagRow
            label="sponsored_placement_delivery_enabled"
            enabled={report.flags.platformDeliveryEnabled}
            hint="Platform DB flag."
          />
        </div>

        {report.evaluation.reasons.length > 0 ? (
          <ul className="space-y-1 text-xs text-amber-200/80">
            {report.evaluation.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/75">
          <p className="font-medium text-white/90">Active placement bookings ({report.activeBookings.length})</p>
          {booking ? (
            <dl className="mt-2 grid gap-1 sm:grid-cols-2">
              <div>
                <dt className="text-white/45">Placement</dt>
                <dd>
                  {booking.placementName}{" "}
                  <span className="font-mono text-[10px] text-white/55">({booking.placementKey})</span>
                </dd>
              </div>
              <div>
                <dt className="text-white/45">Surface / device</dt>
                <dd>
                  {booking.surface} · {booking.placementDevice}
                </dd>
              </div>
              <div>
                <dt className="text-white/45">Booking window</dt>
                <dd className="tabular-nums">
                  {booking.startAt.slice(0, 10)} → {booking.endAt.slice(0, 10)} ({booking.status})
                </dd>
              </div>
              <div>
                <dt className="text-white/45">Campaign flight</dt>
                <dd className="tabular-nums">
                  {report.campaignStart} → {report.campaignEnd}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-white/55">No active or reserved booking linked.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-xs font-medium text-white/85">Creative preview</p>
          <div className="mt-2 flex gap-3">
            {mediaUrl ? (
              <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                <Image src={mediaUrl} alt="" fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 text-[10px] text-white/45">
                No media
              </div>
            )}
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-semibold text-white/90">{report.campaignName}</p>
              {description ? <p className="mt-1 text-white/60">{description}</p> : null}
              {ctaLabel ? (
                <p className="mt-2 text-cyan-200/90">
                  CTA: {ctaLabel}
                  {ctaUrl ? ` → ${ctaUrl}` : ""}
                </p>
              ) : null}
            </div>
          </div>
          {warnings.length ? (
            <ul className="mt-2 space-y-1 text-[11px] text-amber-200/85">
              {warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {!report.flags.platformDeliveryEnabled ? (
          <p className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100/80">
            Public delivery remains off while platform and mobile flags are disabled. Enable only after QA sign-off.
          </p>
        ) : null}
      </div>
    </AdminPanelCard>
  );
}

function FlagRow({ label, enabled, hint }: { label: string; enabled: boolean; hint: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        enabled ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/[0.03]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-medium text-white/85">{label}</span>
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wide",
            enabled ? "text-emerald-300" : "text-white/45",
          )}
        >
          {enabled ? "On" : "Off"}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-white/45">{hint}</p>
    </div>
  );
}
