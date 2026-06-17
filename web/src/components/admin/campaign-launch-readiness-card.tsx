"use client";

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Badge } from "@/components/ui/badge";
import type { LaunchReadinessSummary } from "@/lib/sponsored-delivery-reporting-shared";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<LaunchReadinessSummary["status"], string> = {
  ready: "Ready",
  not_ready: "Not ready",
  ready_flags_off: "Ready but flags off",
  delivering: "Delivering",
  requires_review: "Requires review",
};

type Props = {
  readiness: LaunchReadinessSummary;
};

export function CampaignLaunchReadinessCard({ readiness }: Props) {
  return (
    <AdminPanelCard>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white/90">Launch readiness</h3>
            <p className="mt-1 text-xs text-white/55">Pre-flight checklist for controlled in-feed delivery.</p>
          </div>
          <Badge variant="outline" className="border-white/15 font-normal text-white/85">
            {STATUS_LABELS[readiness.status]}
          </Badge>
        </div>
        <ul className="space-y-2">
          {readiness.items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
                item.passed ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-white/[0.02]",
              )}
            >
              {item.passed ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-hidden />
              ) : item.severity === "info" ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-cyan-300/80" aria-hidden />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-amber-300/80" aria-hidden />
              )}
              <div>
                <p className="font-medium text-white/90">{item.label}</p>
                {item.detail ? <p className="mt-0.5 text-white/50">{item.detail}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AdminPanelCard>
  );
}
