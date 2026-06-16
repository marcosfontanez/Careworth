"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Loader2, Plus } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  InventoryFilters,
  InventoryPlacementSummary,
  PlacementBookingRow,
  PlacementCatalogRow,
} from "@/lib/admin/placement-booking-shared";
import {
  BOOKING_STATUSES,
  INVENTORY_BOOKING_DISCLAIMER,
  PLACEMENT_SURFACES,
} from "@/lib/admin/placement-booking-shared";
import { cn } from "@/lib/utils";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

type Props = {
  summaries: InventoryPlacementSummary[];
  bookings: PlacementBookingRow[];
  placements: PlacementCatalogRow[];
  filters: InventoryFilters;
  bookingEnabled: boolean;
};

export function InventoryBookingConsole({
  summaries,
  bookings,
  placements,
  filters,
  bookingEnabled,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: "ok" | "err"; message: string } | null>(null);
  const [showCreatePlacement, setShowCreatePlacement] = useState(false);
  const [confirm409, setConfirm409] = useState<{ action: string; body: Record<string, unknown> } | null>(null);

  const [newPlacement, setNewPlacement] = useState({
    key: "",
    name: "",
    surface: "feed",
    device: "all",
    capacityType: "shared",
    maxActiveCampaigns: "1",
    description: "",
  });

  const filterForm = useMemo(
    () => ({
      surface: searchParams.get("surface") ?? filters.surface ?? "",
      status: (searchParams.get("status") ?? filters.status ?? "all") as InventoryFilters["status"],
      from: searchParams.get("from") ?? filters.from ?? "",
      to: searchParams.get("to") ?? filters.to ?? "",
      available: searchParams.get("available") === "1" || filters.availableOnly,
      conflict: searchParams.get("conflict") === "1" || filters.conflictOnly,
    }),
    [searchParams, filters],
  );

  const applyFilters = useCallback(
    (next: Partial<typeof filterForm>) => {
      const merged = { ...filterForm, ...next };
      const params = new URLSearchParams();
      if (merged.surface) params.set("surface", merged.surface);
      if (merged.status && merged.status !== "all") params.set("status", merged.status);
      if (merged.from) params.set("from", merged.from);
      if (merged.to) params.set("to", merged.to);
      if (merged.available) params.set("available", "1");
      if (merged.conflict) params.set("conflict", "1");
      const qs = params.toString();
      router.push(qs ? `/admin/inventory?${qs}` : "/admin/inventory");
    },
    [filterForm, router],
  );

  async function mutate(body: Record<string, unknown>, retryConfirm = false) {
    setToast(null);
    const payload = retryConfirm
      ? { ...body, confirmOverCapacity: true, confirmExclusiveConflict: true }
      : body;
    const res = await fetch("/api/admin/placements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; warning?: string };
    if (res.status === 409 && !retryConfirm) {
      setConfirm409({ action: String(body.action ?? ""), body });
      return false;
    }
    if (!res.ok || !data.ok) {
      setToast({ tone: "err", message: data.error ?? "Action failed." });
      return false;
    }
    setToast({ tone: "ok", message: data.warning ?? "Saved." });
    startTransition(() => router.refresh());
    return true;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Partnerships", href: "/admin/advertisers" },
          { label: "Inventory & placements" },
        ]}
        title="Inventory & placement booking"
        description="Internal placement catalog and booking ledger — capacity, conflicts, and campaign reservations. Does not serve public ads."
        actions={
          bookingEnabled ? (
            <Button size="sm" onClick={() => setShowCreatePlacement(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New placement
            </Button>
          ) : (
            <Button size="sm" variant="secondary" disabled>
              Booking disabled
            </Button>
          )
        }
      />

      <p className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs leading-relaxed text-amber-100/90">
        {INVENTORY_BOOKING_DISCLAIMER}
      </p>

      {!bookingEnabled ? (
        <p className="text-xs text-muted-foreground">
          Enable <span className="font-mono">admin_placement_booking_enabled</span> on Platform to create bookings.
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

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              applyFilters({
                surface: String(fd.get("surface") ?? ""),
                status: String(fd.get("status") ?? "all") as InventoryFilters["status"],
                from: String(fd.get("from") ?? ""),
                to: String(fd.get("to") ?? ""),
                available: fd.get("available") === "on",
                conflict: fd.get("conflict") === "on",
              });
            }}
          >
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Surface
              <select
                name="surface"
                defaultValue={filterForm.surface}
                className="flex h-9 w-full rounded-md border border-white/12 bg-background/80 px-2 text-sm"
              >
                <option value="">All</option>
                {PLACEMENT_SURFACES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Booking status
              <select
                name="status"
                defaultValue={filterForm.status}
                className="flex h-9 w-full rounded-md border border-white/12 bg-background/80 px-2 text-sm"
              >
                <option value="all">All</option>
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
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
            <label className="flex items-end gap-2 pb-2 text-xs">
              <input type="checkbox" name="available" defaultChecked={filterForm.available} />
              Available only
            </label>
            <label className="flex items-end gap-2 pb-2 text-xs">
              <input type="checkbox" name="conflict" defaultChecked={filterForm.conflict} />
              Conflicts / over-capacity
            </label>
            <div className="flex gap-2 xl:col-span-6">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Button type="button" size="sm" variant="outline" className="border-white/15" asChild>
                <Link href="/admin/inventory">Clear</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </AdminPanelCard>

      {pending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Refreshing…
        </div>
      ) : null}

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Placement catalog & capacity</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placement</TableHead>
                <TableHead>Surface</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead>Next window</TableHead>
                <TableHead>Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.length ? (
                summaries.map((s) => (
                  <TableRow key={s.placement.id}>
                    <TableCell>
                      <p className="font-medium">{s.placement.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{s.placement.key}</p>
                    </TableCell>
                    <TableCell className="capitalize">{s.placement.surface}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.placement.capacityType} · max {s.placement.maxActiveCampaigns}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.reservedCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.availableSlots}</TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {s.nextBookedStart ? `${fmt(s.nextBookedStart)} → ${fmt(s.nextBookedEnd)}` : "—"}
                    </TableCell>
                    <TableCell>
                      {s.hasConflict || s.hasOverCapacity ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-200">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {s.hasConflict ? "Conflict" : "Over cap"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">OK</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No placements match filters. Apply migration 283 if the catalog is empty.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Bookings ledger</CardTitle>
          <p className="text-xs text-muted-foreground">{bookings.length} rows in current filter</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length ? (
                bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link href={`/admin/campaigns/${b.campaignId}`} className="text-primary hover:underline">
                        {b.campaignName}
                      </Link>
                    </TableCell>
                    <TableCell>{b.placementName}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      {fmt(b.startAt)} → {fmt(b.endAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell>
                      {b.conflict || b.overCapacity ? (
                        <span className="text-xs text-amber-200">
                          {b.conflict ? "Exclusive conflict" : "Over capacity"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {bookingEnabled && b.status !== "cancelled" && b.status !== "completed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/15"
                          onClick={() =>
                            void mutate({ action: "cancel_booking", id: b.id, staffNote: "Cancelled from inventory" })
                          }
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No bookings yet — reserve placements from a campaign detail page.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>

      <Dialog open={showCreatePlacement} onOpenChange={setShowCreatePlacement}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New placement</DialogTitle>
            <DialogDescription>Add a catalog placement staff can book against.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Label>
              Key
              <Input value={newPlacement.key} onChange={(e) => setNewPlacement({ ...newPlacement, key: e.target.value })} />
            </Label>
            <Label>
              Name
              <Input value={newPlacement.name} onChange={(e) => setNewPlacement({ ...newPlacement, name: e.target.value })} />
            </Label>
            <Label>
              Surface
              <select
                className="flex h-9 w-full rounded-md border border-white/12 bg-background/80 px-2 text-sm"
                value={newPlacement.surface}
                onChange={(e) => setNewPlacement({ ...newPlacement, surface: e.target.value })}
              >
                {PLACEMENT_SURFACES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              Capacity type
              <select
                className="flex h-9 w-full rounded-md border border-white/12 bg-background/80 px-2 text-sm"
                value={newPlacement.capacityType}
                onChange={(e) => setNewPlacement({ ...newPlacement, capacityType: e.target.value })}
              >
                <option value="exclusive">exclusive</option>
                <option value="shared">shared</option>
                <option value="rotation">rotation</option>
              </select>
            </Label>
            <Label>
              Max active campaigns
              <Input
                type="number"
                min={1}
                value={newPlacement.maxActiveCampaigns}
                onChange={(e) => setNewPlacement({ ...newPlacement, maxActiveCampaigns: e.target.value })}
              />
            </Label>
            <Label>
              Description
              <Textarea
                rows={2}
                value={newPlacement.description}
                onChange={(e) => setNewPlacement({ ...newPlacement, description: e.target.value })}
              />
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePlacement(false)}>
              Close
            </Button>
            <Button
              onClick={async () => {
                const ok = await mutate({
                  action: "create_placement",
                  placement: {
                    ...newPlacement,
                    maxActiveCampaigns: Number(newPlacement.maxActiveCampaigns),
                  },
                });
                if (ok) setShowCreatePlacement(false);
              }}
            >
              Create placement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirm409)} onOpenChange={(o) => !o && setConfirm409(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Capacity or conflict warning</DialogTitle>
            <DialogDescription>
              This booking overlaps existing reservations. Confirm only if staff intentionally accepts the conflict or
              over-capacity state.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm409(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!confirm409) return;
                await mutate(confirm409.body, true);
                setConfirm409(null);
              }}
            >
              Confirm booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
