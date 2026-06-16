"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";

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
  BookingStatus,
  PlacementBookingRow,
  PlacementCatalogRow,
} from "@/lib/admin/placement-booking-shared";
import { BOOKING_STATUSES, INVENTORY_BOOKING_DISCLAIMER } from "@/lib/admin/placement-booking-shared";
import { cn } from "@/lib/utils";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString();
}

type Props = {
  campaignId: string;
  campaignName: string;
  defaultStart: string;
  defaultEnd: string;
  bookings: PlacementBookingRow[];
  placements: PlacementCatalogRow[];
  bookingEnabled: boolean;
};

export function CampaignBookingsPanel({
  campaignId,
  campaignName,
  defaultStart,
  defaultEnd,
  bookings,
  placements,
  bookingEnabled,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: "ok" | "err"; message: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirm409, setConfirm409] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    placementId: placements[0]?.id ?? "",
    startAt: defaultStart,
    endAt: defaultEnd,
    status: "draft" as BookingStatus,
    notes: "",
  });

  function openCreate() {
    setEditId(null);
    setForm({
      placementId: placements[0]?.id ?? "",
      startAt: defaultStart,
      endAt: defaultEnd,
      status: "draft",
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(b: PlacementBookingRow) {
    setEditId(b.id);
    setForm({
      placementId: b.placementId,
      startAt: b.startAt,
      endAt: b.endAt,
      status: b.status,
      notes: b.notes ?? "",
    });
    setOpen(true);
  }

  async function submit(retryConfirm = false) {
    setToast(null);
    const body = {
      action: editId ? "update_booking" : "create_booking",
      ...(editId ? { id: editId } : {}),
      booking: {
        campaignId,
        placementId: form.placementId,
        startAt: form.startAt,
        endAt: form.endAt,
        status: form.status,
        notes: form.notes,
      },
      ...(retryConfirm ? { confirmOverCapacity: true, confirmExclusiveConflict: true } : {}),
    };
    const res = await fetch("/api/admin/placements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; warning?: string };
    if (res.status === 409 && !retryConfirm) {
      setConfirm409(body);
      return;
    }
    if (!res.ok || !data.ok) {
      setToast({ tone: "err", message: data.error ?? "Booking failed." });
      return;
    }
    setToast({ tone: "ok", message: data.warning ?? "Booking saved." });
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <AdminPanelCard>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Placement bookings</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{INVENTORY_BOOKING_DISCLAIMER}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="border-white/15" asChild>
            <Link href="/admin/inventory">Open inventory</Link>
          </Button>
          {bookingEnabled ? (
            <Button size="sm" onClick={openCreate} disabled={pending}>
              Add booking
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
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

        <Table>
          <TableHeader>
            <TableRow>
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
                    <p className="font-medium">{b.placementName}</p>
                    <p className="text-[10px] capitalize text-muted-foreground">{b.surface}</p>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {fmt(b.startAt)} → {fmt(b.endAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell>
                    {b.conflict || b.overCapacity ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-200">
                        <AlertTriangle className="h-3 w-3" />
                        {b.conflict ? "Conflict" : "Over cap"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {bookingEnabled && !["cancelled", "completed"].includes(b.status) ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/15"
                          disabled={pending}
                          onClick={() => openEdit(b)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/15"
                          disabled={pending}
                          onClick={async () => {
                          const res = await fetch("/api/admin/placements", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "cancel_booking",
                              id: b.id,
                              staffNote: `Cancelled from campaign ${campaignName}`,
                            }),
                          });
                          const data = (await res.json()) as { ok?: boolean; error?: string };
                          if (!data.ok) setToast({ tone: "err", message: data.error ?? "Cancel failed." });
                          else startTransition(() => router.refresh());
                        }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No placement bookings for this campaign yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit booking" : "Reserve placement"}</DialogTitle>
            <DialogDescription>
              Book a catalog placement for <span className="text-foreground/90">{campaignName}</span>. Draft bookings do
              not consume capacity.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Label>
              Placement
              <select
                className="mt-1 flex h-9 w-full rounded-md border border-white/12 bg-background/80 px-2 text-sm"
                value={form.placementId}
                onChange={(e) => setForm({ ...form, placementId: e.target.value })}
              >
                {placements.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.capacityType}, max {p.maxActiveCampaigns})
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              Start
              <Input
                type="datetime-local"
                value={form.startAt.includes("T") ? form.startAt.slice(0, 16) : `${form.startAt}T12:00`}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
            </Label>
            <Label>
              End
              <Input
                type="datetime-local"
                value={form.endAt.includes("T") ? form.endAt.slice(0, 16) : `${form.endAt}T12:00`}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </Label>
            <Label>
              Status
              <select
                className="mt-1 flex h-9 w-full rounded-md border border-white/12 bg-background/80 px-2 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as BookingStatus })}
              >
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              Notes
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={() => void submit()} disabled={pending}>
              {editId ? "Update booking" : "Save booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirm409)} onOpenChange={(o) => !o && setConfirm409(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm overlap</DialogTitle>
            <DialogDescription>This reservation conflicts with existing capacity rules.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm409(null)}>
              Cancel
            </Button>
            <Button onClick={() => void submit(true)}>Confirm anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPanelCard>
  );
}
