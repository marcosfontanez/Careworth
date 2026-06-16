"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  CampaignFormFields,
  CampaignFormSubmitBar,
  emptyCampaignFormValues,
  formValuesToInput,
  type CampaignFormValues,
} from "@/components/admin/campaign-form";
import { CampaignBookingsPanel } from "@/components/admin/campaign-bookings-panel";
import { CampaignDeliveryStatusCard } from "@/components/admin/campaign-delivery-status-card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminCampaignDetail,
  CampaignAuditRow,
  CampaignOwnerOption,
} from "@/lib/admin/campaign-editor-shared";
import type { PlacementBookingRow, PlacementCatalogRow } from "@/lib/admin/placement-booking-shared";
import type { CampaignDeliveryStatus } from "@/lib/admin/sponsored-placement-delivery";
import { formatCount } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

function detailToFormValues(c: AdminCampaignDetail): CampaignFormValues {
  return {
    campaignName: c.campaignName,
    advertiserName: c.sponsor,
    placement: c.placement,
    status: c.status as CampaignFormValues["status"],
    startDate: c.start,
    endDate: c.end,
    objective: c.objective ?? "",
    budgetTotal: c.budgetTotal > 0 ? String(c.budgetTotal) : "",
    ownerId: c.ownerId ?? "",
    leadId: c.leadId ?? "",
    internalNotes: c.internalNotes ?? "",
    targetAudienceNotes: c.targetAudienceNotes ?? "",
    creativeNotes: c.creativeNotes ?? "",
    confirmLockedEdit: false,
  };
}

type Props = {
  campaign: AdminCampaignDetail;
  audit: CampaignAuditRow[];
  owners: CampaignOwnerOption[];
  placements: string[];
  editorEnabled: boolean;
  initialEdit?: boolean;
  bookings: PlacementBookingRow[];
  catalogPlacements: PlacementCatalogRow[];
  bookingEnabled: boolean;
  deliveryStatus: CampaignDeliveryStatus;
};

export function CampaignDetailEditor({
  campaign,
  audit,
  owners,
  placements,
  editorEnabled,
  initialEdit = false,
  bookings,
  catalogPlacements,
  bookingEnabled,
  deliveryStatus,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(initialEdit && editorEnabled);
  const [values, setValues] = useState<CampaignFormValues>(() => detailToFormValues(campaign));
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: "ok" | "err"; message: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDeliveryActivate, setConfirmDeliveryActivate] = useState(false);

  const locked = ["completed", "cancelled"].includes(campaign.status);

  async function mutate(body: Record<string, unknown>) {
    setToast(null);
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setToast({ tone: "err", message: data.error ?? "Action failed." });
      return false;
    }
    setToast({ tone: "ok", message: "Saved." });
    startTransition(() => {
      router.refresh();
      setEditing(false);
    });
    return true;
  }

  async function saveEdit() {
    await mutate({
      action: "update",
      id: campaign.id,
      campaign: formValuesToInput(values),
    });
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Campaigns", href: "/admin/campaigns" },
          { label: campaign.campaignName },
        ]}
        title={campaign.campaignName}
        description={`${campaign.sponsor} · ${campaign.placement} · operational status ${campaign.status}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/campaigns">Back to list</Link>
            </Button>
            {editorEnabled && !editing ? (
              <Button size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            ) : null}
          </div>
        }
      />

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
        className="xl:grid-cols-5"
        items={[
          { label: "Status", value: campaign.status, hint: "operational only" },
          { label: "Impressions", value: formatCount(campaign.impressions), hint: "row total" },
          { label: "Clicks", value: formatCount(campaign.clicks), hint: "row total" },
          { label: "CTR", value: `${campaign.ctr.toFixed(3)}%`, hint: "clicks ÷ impressions" },
          {
            label: "Budget",
            value:
              campaign.budgetTotal > 0
                ? `${formatCount(campaign.budgetSpent)} / ${formatCount(campaign.budgetTotal)}`
                : "—",
            hint: "spent / total",
          },
        ]}
      />

      <CampaignDeliveryStatusCard status={deliveryStatus} />

      {editing ? (
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Edit campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CampaignFormFields
              values={values}
              onChange={setValues}
              owners={owners}
              placements={placements}
              locked={locked}
            />
            <CampaignFormSubmitBar
              pending={pending}
              label="Save changes"
              onSubmit={() => void saveEdit()}
              onCancel={() => {
                setValues(detailToFormValues(campaign));
                setEditing(false);
              }}
            />
          </CardContent>
        </AdminPanelCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanelCard>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <p className="text-xs text-muted-foreground">
                Last updated {campaign.updatedAt ? new Date(campaign.updatedAt).toLocaleString() : "—"}
              </p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Status: <StatusBadge status={campaign.status} />
              </p>
              <p>
                Objective: <span className="text-foreground/90">{campaign.objective ?? "—"}</span>
              </p>
              <p>
                Schedule:{" "}
                <span className="tabular-nums text-foreground">
                  {campaign.start} → {campaign.end}
                </span>
              </p>
              <p>
                Owner: <span className="text-foreground/90">{campaign.ownerDisplayName ?? "Unassigned"}</span>
              </p>
              {campaign.leadId ? (
                <p>
                  Lead:{" "}
                  <Link href="/admin/leads" className="text-primary underline">
                    {campaign.leadName ?? campaign.leadId.slice(0, 8)}…
                  </Link>
                  {campaign.leadEmail ? ` (${campaign.leadEmail})` : null}
                </p>
              ) : null}
              {campaign.pacingNote ? (
                <p className="text-xs text-foreground/85">{campaign.pacingNote}</p>
              ) : null}
            </CardContent>
          </AdminPanelCard>

          <AdminPanelCard>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Internal</p>
                <p className="mt-1 whitespace-pre-wrap text-foreground/85">{campaign.internalNotes || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Audience</p>
                <p className="mt-1 whitespace-pre-wrap">{campaign.targetAudienceNotes || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Creative</p>
                <p className="mt-1 whitespace-pre-wrap">{campaign.creativeNotes || "—"}</p>
              </div>
            </CardContent>
          </AdminPanelCard>
        </div>
      )}

      <CampaignBookingsPanel
        campaignId={campaign.id}
        campaignName={campaign.campaignName}
        defaultStart={campaign.start}
        defaultEnd={campaign.end}
        bookings={bookings}
        placements={catalogPlacements}
        bookingEnabled={bookingEnabled}
      />

      {editorEnabled && !editing ? (
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Status actions</CardTitle>
            <p className="text-xs text-muted-foreground">Operational status only — does not toggle public ad serving.</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {campaign.status === "active" ? (
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => void mutate({ action: "pause", id: campaign.id })}>
                Pause
              </Button>
            ) : null}
            {campaign.status === "paused" ? (
              <Button size="sm" disabled={pending} onClick={() => setConfirmDeliveryActivate(true)}>
                Resume
              </Button>
            ) : null}
            {!["completed", "cancelled"].includes(campaign.status) ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15"
                  disabled={pending}
                  onClick={() => void mutate({ action: "complete", id: campaign.id })}
                >
                  Mark completed
                </Button>
                <Button size="sm" variant="destructive" disabled={pending} onClick={() => setConfirmCancel(true)}>
                  Cancel campaign
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="border-white/15"
              disabled={pending}
              onClick={async () => {
                const res = await fetch("/api/admin/campaigns", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "duplicate", id: campaign.id }),
                });
                const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
                if (data.ok && data.id) router.push(`/admin/campaigns/${data.id}`);
                else setToast({ tone: "err", message: data.error ?? "Duplicate failed." });
              }}
            >
              Duplicate
            </Button>
          </CardContent>
        </AdminPanelCard>
      ) : null}

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Time series performance</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Per-day impressions/clicks require a warehouse table — not available in this console today. Lifetime totals
          above come from the campaign row.
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Audit history</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {audit.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.action}</TableCell>
                    <TableCell className="text-sm">{row.staffDisplayName}</TableCell>
                    <TableCell className="max-w-[320px] truncate font-mono text-[10px] text-muted-foreground">
                      {JSON.stringify(row.metadata)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No audit rows yet for this campaign.</p>
          )}
        </CardContent>
      </AdminPanelCard>

      <Dialog open={confirmDeliveryActivate} onOpenChange={setConfirmDeliveryActivate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate campaign for delivery?</DialogTitle>
            <DialogDescription>
              Turning on sponsored delivery can make eligible booked campaigns visible to users when both delivery flags
              are enabled. Confirm only after creative and booking QA.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeliveryActivate(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await mutate({
                  action: "resume",
                  id: campaign.id,
                  confirmDeliveryActivation: true,
                });
                setConfirmDeliveryActivate(false);
              }}
            >
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel campaign?</DialogTitle>
            <DialogDescription>This marks the campaign cancelled — it does not delete the record.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(false)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await mutate({ action: "cancel", id: campaign.id });
                setConfirmCancel(false);
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
