"use client";

import { AlertTriangle } from "lucide-react";

import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Badge } from "@/components/ui/badge";
import type { CampaignDeliveryStatus } from "@/lib/admin/sponsored-placement-delivery";
import { formatCount } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

const STATE_LABELS: Record<CampaignDeliveryStatus["evaluation"]["state"], string> = {
  not_delivering: "Not delivering",
  eligible_flags_off: "Eligible — flags off",
  delivering: "Delivering",
  blocked_creative: "Blocked — missing creative",
  blocked_status: "Blocked — campaign status",
  blocked_dates: "Blocked — outside date window",
  blocked_budget: "Blocked — budget exhausted",
  blocked_no_booking: "Blocked — no active booking",
  blocked_booking: "Blocked — booking ineligible",
  blocked_placement: "Blocked — placement inactive",
};

function toneForState(state: CampaignDeliveryStatus["evaluation"]["state"]) {
  if (state === "delivering") return "ok" as const;
  if (state === "eligible_flags_off") return "warn" as const;
  return "muted" as const;
}

type Props = {
  status: CampaignDeliveryStatus;
};

export function CampaignDeliveryStatusCard({ status }: Props) {
  const tone = toneForState(status.evaluation.state);

  return (
    <AdminPanelCard>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white/90">Delivery status</h3>
            <p className="mt-1 max-w-xl text-xs text-white/55">
              Controlled in-app delivery requires both the mobile{" "}
              <span className="font-mono text-[11px]">sponsoredPosts</span> flag and the platform{" "}
              <span className="font-mono text-[11px]">sponsored_placement_delivery_enabled</span> flag.
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
            {STATE_LABELS[status.evaluation.state]}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FlagRow
            label="Mobile sponsoredPosts"
            enabled={status.flags.sponsoredPostsEnabled}
            hint="Toggle in mobile Admin → Feature flags (session-only today)."
          />
          <FlagRow
            label="Platform delivery flag"
            enabled={status.flags.platformDeliveryEnabled}
            hint="Platform → feature_flags → sponsored_placement_delivery_enabled"
          />
        </div>

        {status.evaluation.reasons.length > 0 ? (
          <ul className="space-y-1 text-xs text-amber-200/80">
            {status.evaluation.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="grid gap-2 text-xs text-white/70 sm:grid-cols-2">
          <div>
            Active bookings:{" "}
            <span className="font-medium text-white/90">{status.activeBookings.length}</span>
          </div>
          <div>
            Lifetime impressions:{" "}
            <span className="font-medium text-white/90">{formatCount(status.impressions)}</span>
          </div>
          <div>Last impression: {status.lastImpressionAt ? new Date(status.lastImpressionAt).toLocaleString() : "—"}</div>
          <div>Last click: {status.lastClickAt ? new Date(status.lastClickAt).toLocaleString() : "—"}</div>
          <div>
            Lifetime clicks: <span className="font-medium text-white/90">{formatCount(status.clicks)}</span>
          </div>
        </div>

        {!status.flags.platformDeliveryEnabled ? (
          <p className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100/80">
            Turning on sponsored delivery can make eligible booked campaigns visible to users. Keep both flags off until
            internal QA is complete.
          </p>
        ) : null}
      </div>
    </AdminPanelCard>
  );
}

function FlagRow({ label, enabled, hint }: { label: string; enabled: boolean; hint: string }) {
  return (
    <div className={cn("rounded-xl border px-3 py-2", enabled ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/[0.03]")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/85">{label}</span>
        <span className={cn("text-[11px] font-semibold uppercase tracking-wide", enabled ? "text-emerald-300" : "text-white/45")}>
          {enabled ? "On" : "Off"}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-white/45">{hint}</p>
    </div>
  );
}
