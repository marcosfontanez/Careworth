"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { AdminOpsStrip } from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { SponsoredDeliveryCsvExport } from "@/components/admin/sponsored-delivery-csv-export";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCount } from "@/lib/admin/format";
import {
  CAMPAIGN_STATUSES,
} from "@/lib/admin/campaign-editor-shared";
import {
  dashboardAlertTags,
  DELIVERY_STATE_LABELS,
  type CampaignDeliveryReportRow,
  type SponsoredReportingFilters,
} from "@/lib/sponsored-delivery-reporting-shared";

type Props = {
  rows: CampaignDeliveryReportRow[];
  total: number;
  filters: SponsoredReportingFilters;
  platformDeliveryEnabled: boolean;
  placements: { key: string; name: string; surface: string }[];
};

export function SponsoredDeliveryReportingConsole({
  rows,
  total,
  filters,
  platformDeliveryEnabled,
  placements,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterForm = useMemo(
    () => ({
      status: searchParams.get("status") ?? filters.status ?? "all",
      deliveryState: searchParams.get("deliveryState") ?? filters.deliveryState ?? "all",
      placementKey: searchParams.get("placementKey") ?? filters.placementKey ?? "",
      surface: searchParams.get("surface") ?? filters.surface ?? "",
      from: searchParams.get("from") ?? filters.from ?? "",
      to: searchParams.get("to") ?? filters.to ?? "",
      advertiser: searchParams.get("advertiser") ?? filters.advertiser ?? "",
      hasImpressions: searchParams.get("hasImpressions") ?? filters.hasImpressions ?? "all",
      hasClicks: searchParams.get("hasClicks") ?? filters.hasClicks ?? "all",
      blockedOnly: searchParams.get("blockedOnly") === "1",
    }),
    [searchParams, filters],
  );

  const applyFilters = useCallback(
    (next: Partial<typeof filterForm>) => {
      const merged = { ...filterForm, ...next };
      const params = new URLSearchParams();
      if (merged.status && merged.status !== "all") params.set("status", merged.status);
      if (merged.deliveryState && merged.deliveryState !== "all") params.set("deliveryState", merged.deliveryState);
      if (merged.placementKey) params.set("placementKey", merged.placementKey);
      if (merged.surface) params.set("surface", merged.surface);
      if (merged.from) params.set("from", merged.from);
      if (merged.to) params.set("to", merged.to);
      if (merged.advertiser) params.set("advertiser", merged.advertiser);
      if (merged.hasImpressions !== "all") params.set("hasImpressions", merged.hasImpressions);
      if (merged.hasClicks !== "all") params.set("hasClicks", merged.hasClicks);
      if (merged.blockedOnly) params.set("blockedOnly", "1");
      const qs = params.toString();
      router.push(qs ? `/admin/reports/sponsored?${qs}` : "/admin/reports/sponsored");
    },
    [filterForm, router],
  );

  const delivering = rows.filter((r) => r.deliveryState === "delivering").length;
  const flagsOff = rows.filter((r) => r.deliveryState === "eligible_flags_off").length;
  const blocked = rows.filter((r) => r.evaluation.state.startsWith("blocked_")).length;

  const buckets = {
    active: rows.filter((r) => dashboardAlertTags(r).includes("active")),
    delivering: rows.filter((r) => dashboardAlertTags(r).includes("delivering")),
    eligibleFlagsOff: rows.filter((r) => dashboardAlertTags(r).includes("eligible_flags_off")),
    missingCreative: rows.filter((r) => dashboardAlertTags(r).includes("missing_creative")),
    endingSoon: rows.filter((r) => dashboardAlertTags(r).includes("booking_ending_soon")),
    zeroImpressions: rows.filter((r) => dashboardAlertTags(r).includes("zero_impressions")),
    unsafeCta: rows.filter((r) => dashboardAlertTags(r).includes("unsafe_cta")),
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Reports", href: "/admin/reports" },
          { label: "Sponsored delivery" },
        ]}
        title="Sponsored delivery reporting"
        description={`${total} campaigns · platform delivery flag ${platformDeliveryEnabled ? "ON" : "OFF"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <SponsoredDeliveryCsvExport rows={rows} />
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/campaigns">Campaigns</Link>
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/inventory">Inventory</Link>
            </Button>
          </div>
        }
      />

      <AdminOpsStrip
        className="xl:grid-cols-4"
        items={[
          { label: "Delivering", value: String(delivering), hint: "all flags + eligibility" },
          { label: "Eligible, flags off", value: String(flagsOff), hint: "would serve if enabled" },
          { label: "Blocked", value: String(blocked), hint: "creative/booking/status" },
          {
            label: "Platform flag",
            value: platformDeliveryEnabled ? "ON" : "OFF",
            hint: "sponsored_placement_delivery_enabled",
          },
        ]}
      />

      <AdminPanelCard className="p-4">
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
          <FilterSelect
            label="Status"
            value={filterForm.status}
            onChange={(v) => applyFilters({ status: v })}
            options={[{ value: "all", label: "All" }, ...CAMPAIGN_STATUSES.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            label="Delivery"
            value={filterForm.deliveryState}
            onChange={(v) => applyFilters({ deliveryState: v })}
            options={[
              { value: "all", label: "All" },
              ...Object.entries(DELIVERY_STATE_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            label="Placement"
            value={filterForm.placementKey}
            onChange={(v) => applyFilters({ placementKey: v })}
            options={[
              { value: "", label: "All" },
              ...placements.map((p) => ({ value: p.key, label: p.name })),
            ]}
          />
          <label className="text-xs text-white/55">
            Advertiser
            <Input
              className="mt-1 h-8 border-white/15 bg-white/5 text-sm"
              defaultValue={filterForm.advertiser}
              onBlur={(e) => applyFilters({ advertiser: e.target.value })}
            />
          </label>
          <label className="text-xs text-white/55">
            From
            <Input
              type="date"
              className="mt-1 h-8 border-white/15 bg-white/5 text-sm"
              defaultValue={filterForm.from}
              onBlur={(e) => applyFilters({ from: e.target.value })}
            />
          </label>
          <label className="text-xs text-white/55">
            To
            <Input
              type="date"
              className="mt-1 h-8 border-white/15 bg-white/5 text-sm"
              defaultValue={filterForm.to}
              onBlur={(e) => applyFilters({ to: e.target.value })}
            />
          </label>
          <FilterSelect
            label="Impressions"
            value={filterForm.hasImpressions}
            onChange={(v) => applyFilters({ hasImpressions: v })}
            options={[
              { value: "all", label: "Any" },
              { value: "yes", label: "Has" },
              { value: "no", label: "None" },
            ]}
          />
          <div className="flex items-end">
            <Button
              type="button"
              size="sm"
              variant={filterForm.blockedOnly ? "default" : "outline"}
              className="border-white/15"
              onClick={() => applyFilters({ blockedOnly: !filterForm.blockedOnly })}
            >
              Blocked only
            </Button>
          </div>
        </div>
      </AdminPanelCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <BucketCard title="Delivering now" rows={buckets.delivering} />
        <BucketCard title="Eligible but flags off" rows={buckets.eligibleFlagsOff} />
        <BucketCard title="Missing / invalid creative" rows={buckets.missingCreative} />
        <BucketCard title="Booking ending within 7 days" rows={buckets.endingSoon} />
        <BucketCard title="Zero impressions (flags on)" rows={buckets.zeroImpressions} />
        <BucketCard title="Unsafe / missing CTA" rows={buckets.unsafeCta} />
      </div>

      <AdminPanelCard>
        <div className="overflow-x-auto p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead className="text-right">Impr.</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.campaignId}>
                  <TableCell>
                    <div className="font-medium text-white/90">{row.campaignName}</div>
                    <div className="text-xs text-white/50">{row.advertiserName}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.campaignStatus} />
                  </TableCell>
                  <TableCell className="text-xs text-white/70">{DELIVERY_STATE_LABELS[row.deliveryState]}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(row.impressions)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(row.clicks)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.ctr.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/admin/campaigns/${row.campaignId}`}>Detail</Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/admin/campaigns/${row.campaignId}/report`}>Report</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AdminPanelCard>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="text-xs text-white/55">
      {label}
      <select
        className="mt-1 h-8 w-full rounded-md border border-white/15 bg-white/5 px-2 text-sm text-white/90"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BucketCard({ title, rows }: { title: string; rows: CampaignDeliveryReportRow[] }) {
  return (
    <AdminPanelCard className="p-4">
      <p className="text-sm font-semibold text-white/90">
        {title} <span className="text-white/45">({rows.length})</span>
      </p>
      <ul className="mt-2 space-y-1 text-xs text-white/65">
        {rows.slice(0, 5).map((r) => (
          <li key={r.campaignId}>
            <Link href={`/admin/campaigns/${r.campaignId}`} className="text-cyan-200/90 hover:underline">
              {r.campaignName}
            </Link>
          </li>
        ))}
        {rows.length === 0 ? <li className="text-white/40">None</li> : null}
        {rows.length > 5 ? <li className="text-white/40">+{rows.length - 5} more</li> : null}
      </ul>
    </AdminPanelCard>
  );
}
