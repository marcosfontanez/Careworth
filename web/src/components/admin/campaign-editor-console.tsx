"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Loader2, MoreHorizontal, Plus } from "lucide-react";

import { CampaignListCsvExport } from "@/components/admin/campaign-list-csv-export";
import { AdminOpsStrip } from "@/components/admin/dashboard-panels";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminCampaignListRow,
  CampaignEditorFilters,
  CampaignOwnerOption,
  CampaignSort,
  CampaignStatus,
} from "@/lib/admin/campaign-editor-shared";
import { CAMPAIGN_SORTS, CAMPAIGN_STATUSES, toCampaignCsvRows } from "@/lib/admin/campaign-editor-shared";
import { formatCount } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: CampaignEditorFilters["status"]; label: string }[] = [
  { value: "all", label: "All" },
  ...CAMPAIGN_STATUSES.map((s) => ({ value: s as CampaignEditorFilters["status"], label: s })),
];

type Props = {
  campaigns: AdminCampaignListRow[];
  total: number;
  filters: CampaignEditorFilters;
  owners: CampaignOwnerOption[];
  placements: string[];
  editorEnabled: boolean;
};

export function CampaignEditorConsole({
  campaigns,
  total,
  filters,
  owners,
  placements,
  editorEnabled,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: "ok" | "err"; message: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<AdminCampaignListRow | null>(null);

  const filterForm = useMemo(
    () => ({
      q: searchParams.get("q") ?? filters.q ?? "",
      status: (searchParams.get("status") ?? filters.status ?? "all") as CampaignEditorFilters["status"],
      placement: searchParams.get("placement") ?? filters.placement ?? "",
      ownerId: searchParams.get("ownerId") ?? filters.ownerId ?? "",
      from: searchParams.get("from") ?? filters.from ?? "",
      to: searchParams.get("to") ?? filters.to ?? "",
      sort: (searchParams.get("sort") ?? filters.sort ?? "newest") as CampaignSort,
    }),
    [searchParams, filters],
  );

  const applyFilters = useCallback(
    (next: Partial<typeof filterForm>) => {
      const merged = { ...filterForm, ...next };
      const params = new URLSearchParams();
      if (merged.q) params.set("q", merged.q);
      if (merged.status && merged.status !== "all") params.set("status", merged.status);
      if (merged.placement) params.set("placement", merged.placement);
      if (merged.ownerId) params.set("ownerId", merged.ownerId);
      if (merged.from) params.set("from", merged.from);
      if (merged.to) params.set("to", merged.to);
      if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
      const qs = params.toString();
      router.push(qs ? `/admin/campaigns?${qs}` : "/admin/campaigns");
    },
    [filterForm, router],
  );

  const impressions = campaigns.reduce((a, c) => a + c.impressions, 0);
  const clicks = campaigns.reduce((a, c) => a + c.clicks, 0);
  const blendedCtr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  async function mutate(body: Record<string, unknown>) {
    setToast(null);
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; id?: string };
    if (!res.ok || !data.ok) {
      setToast({ tone: "err", message: data.error ?? "Action failed." });
      return false;
    }
    setToast({ tone: "ok", message: "Saved." });
    startTransition(() => router.refresh());
    return true;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Partnerships", href: "/admin/advertisers" },
          { label: "Campaigns" },
        ]}
        title="Campaign operations"
        description={`Portfolio + planning console over ad_campaigns (${total} rows). CSV export preserved — delivery metrics are row totals only.`}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <CampaignListCsvExport rows={toCampaignCsvRows(campaigns)} />
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/inventory">Inventory & placements</Link>
            </Button>
            {editorEnabled ? (
              <Button size="sm" className="bg-primary text-primary-foreground" asChild>
                <Link href="/admin/campaigns/new">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New campaign
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="secondary" disabled title="Enable admin_campaign_editor_enabled on Platform">
                Editor disabled
              </Button>
            )}
          </div>
        }
      />

      {!editorEnabled ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Campaign editor is off via <span className="font-mono">admin_campaign_editor_enabled</span>. List and export
          remain available; enable the flag on Platform to create or edit.
        </p>
      ) : null}

      {toast ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            toast.tone === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-100",
          )}
        >
          {toast.message}
        </p>
      ) : null}

      <AdminOpsStrip
        items={[
          { label: "Rows tracked", value: String(total), hint: "filtered" },
          { label: "Impressions Σ", value: formatCount(impressions), hint: "list rollup" },
          { label: "Clicks Σ", value: formatCount(clicks), hint: "list rollup" },
          { label: "Blended CTR", value: `${blendedCtr.toFixed(3)}%`, hint: "Σ clicks ÷ Σ impr." },
        ]}
        className="xl:grid-cols-4"
      />

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              applyFilters({
                q: String(fd.get("q") ?? ""),
                status: String(fd.get("status") ?? "all") as CampaignEditorFilters["status"],
                placement: String(fd.get("placement") ?? ""),
                ownerId: String(fd.get("ownerId") ?? ""),
                from: String(fd.get("from") ?? ""),
                to: String(fd.get("to") ?? ""),
                sort: String(fd.get("sort") ?? "newest") as CampaignSort,
              });
            }}
          >
            <label className="space-y-1 text-xs font-medium text-muted-foreground xl:col-span-2">
              Search
              <Input name="q" defaultValue={filterForm.q} placeholder="Campaign, advertiser, placement…" />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Status
              <select
                name="status"
                defaultValue={filterForm.status}
                className="flex h-9 w-full rounded-md border border-white/12 bg-background/80 px-2 text-sm"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Sort
              <select
                name="sort"
                defaultValue={filterForm.sort}
                className="flex h-9 w-full rounded-md border border-white/12 bg-background/80 px-2 text-sm"
              >
                {CAMPAIGN_SORTS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Placement
              <Input name="placement" list="filter-placements" defaultValue={filterForm.placement} />
              <datalist id="filter-placements">
                {placements.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Owner
              <select
                name="ownerId"
                defaultValue={filterForm.ownerId}
                className="flex h-9 w-full rounded-md border border-white/12 bg-background/80 px-2 text-sm"
              >
                <option value="">All owners</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              From
              <Input name="from" type="date" defaultValue={filterForm.from} />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              To
              <Input name="to" type="date" defaultValue={filterForm.to} />
            </label>
            <div className="flex flex-wrap items-end gap-2 xl:col-span-2">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-white/15" asChild>
                <Link href="/admin/campaigns">Clear</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Campaign list</CardTitle>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CAMPAIGN_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applyFilters({ status: s as CampaignStatus })}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                  filterForm.status === s
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-white/10 text-muted-foreground hover:border-white/20",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {pending ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Refreshing…
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Campaign</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="text-right">Impr.</TableHead>
                <TableHead className="text-right">CTR %</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length ? (
                campaigns.map((c) => (
                  <TableRow key={c.id} className="border-border">
                    <TableCell className="max-w-[180px]">
                      <p className="truncate font-medium">{c.campaignName}</p>
                      {c.ownerDisplayName ? (
                        <p className="truncate text-[10px] text-muted-foreground">Owner: {c.ownerDisplayName}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>{c.sponsor}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground">{c.placement}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      {c.start} → {c.end}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(c.impressions)}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.ctr.toFixed(3)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/campaigns/${c.id}`}>View</Link>
                        </Button>
                        {editorEnabled ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                              aria-label="Campaign actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/admin/campaigns/${c.id}?edit=1`)}>
                                Edit
                              </DropdownMenuItem>
                              {c.status === "active" ? (
                                <DropdownMenuItem
                                  onClick={() => void mutate({ action: "pause", id: c.id })}
                                >
                                  Pause
                                </DropdownMenuItem>
                              ) : null}
                              {c.status === "paused" ? (
                                <DropdownMenuItem
                                  onClick={() => void mutate({ action: "resume", id: c.id })}
                                >
                                  Resume
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                onClick={async () => {
                                  const res = await fetch("/api/admin/campaigns", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "duplicate", id: c.id }),
                                  });
                                  const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
                                  if (data.ok && data.id) router.push(`/admin/campaigns/${data.id}`);
                                  else setToast({ tone: "err", message: data.error ?? "Duplicate failed." });
                                }}
                              >
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {!["completed", "cancelled"].includes(c.status) ? (
                                <DropdownMenuItem
                                  className="text-amber-200"
                                  onClick={() => setConfirmCancel(c)}
                                >
                                  Cancel campaign
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No campaigns match these filters.
                    {editorEnabled ? (
                      <>
                        {" "}
                        <Link href="/admin/campaigns/new" className="text-primary underline">
                          Create one
                        </Link>
                      </>
                    ) : null}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>

      <Dialog open={Boolean(confirmCancel)} onOpenChange={(o) => !o && setConfirmCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel campaign?</DialogTitle>
            <DialogDescription>
              Marks <span className="text-foreground/90">{confirmCancel?.campaignName}</span> as cancelled. This does
              not delete the row.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(null)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirmCancel) return;
                await mutate({ action: "cancel", id: confirmCancel.id });
                setConfirmCancel(null);
              }}
            >
              Cancel campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
