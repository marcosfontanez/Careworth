"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Check, Copy, Loader2, RefreshCw, RotateCcw } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { WebhookOutboxSummaryCard } from "@/components/admin/webhook-outbox-summary-card";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
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
  WebhookOutboxEventRow,
  WebhookOutboxFilters,
  WebhookOutboxStatusFilter,
  WebhookOutboxSummary,
} from "@/lib/admin/webhook-outbox";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: WebhookOutboxStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "delivered", label: "Delivered" },
  { value: "retrying", label: "Retrying" },
  { value: "ignored", label: "Ignored" },
];

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

type Props = {
  summary: WebhookOutboxSummary;
  events: WebhookOutboxEventRow[];
  total: number;
  eventTypes: string[];
  filters: WebhookOutboxFilters;
};

export function WebhookOutboxConsole({ summary, events, total, eventTypes, filters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<WebhookOutboxEventRow | null>(null);
  const [toast, setToast] = useState<{ tone: "ok" | "err"; message: string } | null>(null);
  const [confirmRetry, setConfirmRetry] = useState<{ ids: string[]; highAttempts: boolean } | null>(null);
  const [staffNote, setStaffNote] = useState("");

  const filterForm = useMemo(
    () => ({
      status: searchParams.get("status") ?? filters.status ?? "all",
      eventType: searchParams.get("eventType") ?? filters.eventType ?? "",
      q: searchParams.get("q") ?? filters.q ?? "",
      from: searchParams.get("from") ?? filters.from ?? "",
      to: searchParams.get("to") ?? filters.to ?? "",
      stale: searchParams.get("stale") ?? (filters.staleOnly ? "1" : ""),
    }),
    [searchParams, filters],
  );

  const applyFilters = useCallback(
    (next: Partial<typeof filterForm>) => {
      const merged = { ...filterForm, ...next };
      const params = new URLSearchParams();
      if (merged.status && merged.status !== "all") params.set("status", merged.status);
      if (merged.eventType) params.set("eventType", merged.eventType);
      if (merged.q) params.set("q", merged.q);
      if (merged.from) params.set("from", merged.from);
      if (merged.to) params.set("to", merged.to);
      if (merged.stale === "1") params.set("stale", "1");
      const qs = params.toString();
      router.push(qs ? `/admin/platform/webhooks?${qs}` : "/admin/platform/webhooks");
    },
    [filterForm, router],
  );

  async function mutate(action: "retry" | "ignore", ids: string[], confirmHighAttempts = false) {
    setToast(null);
    const res = await fetch("/api/admin/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ids,
        confirmHighAttempts,
        staffNote: staffNote.trim() || undefined,
      }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      needsHighAttemptConfirm?: boolean;
      updated?: number;
    };

    if (!data.ok) {
      if (data.needsHighAttemptConfirm && action === "retry") {
        setConfirmRetry({ ids, highAttempts: true });
        return;
      }
      setToast({ tone: "err", message: data.error ?? "Action failed." });
      return;
    }

    setConfirmRetry(null);
    setStaffNote("");
    setSelected(new Set());
    setToast({
      tone: "ok",
      message:
        action === "retry"
          ? `Re-queued ${data.updated ?? ids.length} event(s) for delivery.`
          : `Marked ${data.updated ?? ids.length} event(s) as ignored.`,
    });
    startTransition(() => router.refresh());
  }

  function requestRetry(ids: string[]) {
    if (!ids.length) return;
    setConfirmRetry({ ids, highAttempts: false });
  }

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setToast({ tone: "ok", message: "Event id copied." });
    } catch {
      setToast({ tone: "err", message: "Could not copy to clipboard." });
    }
  }

  const failedSelected = [...selected].filter((id) => {
    const row = events.find((e) => e.id === id);
    return row && row.status !== "delivered" && row.status !== "ignored";
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Platform", href: "/admin/platform" },
          { label: "Webhook outbox" },
        ]}
        title="Webhook outbox"
        description="Monitor delivery health, inspect failures, and safely re-queue events for the external webhook worker."
      />

      {toast ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            toast.tone === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-200",
          )}
        >
          {toast.message}
        </p>
      ) : null}

      <WebhookOutboxSummaryCard summary={summary} compact />

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="wh-status">Status</Label>
            <select
              id="wh-status"
              className="h-9 w-full rounded-md border border-white/10 bg-secondary/30 px-2 text-sm"
              value={filterForm.status}
              onChange={(e) => applyFilters({ status: e.target.value })}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wh-type">Event type</Label>
            <select
              id="wh-type"
              className="h-9 w-full rounded-md border border-white/10 bg-secondary/30 px-2 text-sm"
              value={filterForm.eventType}
              onChange={(e) => applyFilters({ eventType: e.target.value })}
            >
              <option value="">All types</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wh-from">Created from</Label>
            <Input
              id="wh-from"
              type="date"
              value={filterForm.from}
              onChange={(e) => applyFilters({ from: e.target.value })}
              className="bg-secondary/30"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wh-to">Created to</Label>
            <Input
              id="wh-to"
              type="date"
              value={filterForm.to}
              onChange={(e) => applyFilters({ to: e.target.value })}
              className="bg-secondary/30"
            />
          </div>
          <div className="space-y-1 lg:col-span-1">
            <Label htmlFor="wh-q">Search</Label>
            <Input
              id="wh-q"
              placeholder="Event id, report id…"
              defaultValue={filterForm.q}
              className="bg-secondary/30"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applyFilters({ q: (e.target as HTMLInputElement).value });
                }
              }}
            />
          </div>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Events</CardTitle>
            <p className="text-xs text-muted-foreground">
              {total.toLocaleString()} matching · showing {events.length}
              {filterForm.stale === "1" ? " · stale pending only" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => router.refresh())}
            >
              {pending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
              Refresh
            </Button>
            <Button
              size="sm"
              type="button"
              disabled={!failedSelected.length || pending}
              onClick={() => requestRetry(failedSelected)}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Retry selected
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {pending && !events.length ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No webhook events found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Created</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead>Last attempt</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((row) => {
                  const canRetry =
                    row.status === "failed" || row.status === "retrying" || row.status === "pending";
                  const checked = selected.has(row.id);
                  return (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => setDetail(row)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checked}
                          aria-label={`Select ${row.id}`}
                          onChange={(e) => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(row.id);
                              else next.delete(row.id);
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {fmt(row.createdAt)}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate font-mono text-xs">{row.eventType}</TableCell>
                      <TableCell className="text-xs">
                        {row.relatedHref ? (
                          <Link
                            href={row.relatedHref}
                            className="text-primary underline-offset-2 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.targetLabel}
                          </Link>
                        ) : (
                          row.targetLabel
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{row.attempts}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {fmt(row.lastAttemptedAt)}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-xs text-red-200/90">
                        {row.lastError ?? "—"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {canRetry ? (
                            <Button size="sm" variant="outline" type="button" onClick={() => requestRetry([row.id])}>
                              Retry
                            </Button>
                          ) : null}
                          {row.status !== "delivered" && row.status !== "ignored" ? (
                            <Button size="sm" variant="ghost" type="button" onClick={() => mutate("ignore", [row.id])}>
                              Ignore
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </AdminPanelCard>

      <Sheet open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle>Webhook event</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 overflow-y-auto pb-8 text-sm">
                <div className="grid gap-2 text-xs">
                  <DetailRow label="Event id" value={detail.id} mono />
                  <DetailRow label="Type" value={detail.eventType} mono />
                  <DetailRow label="Status" value={detail.status} />
                  <DetailRow label="Attempts" value={String(detail.attempts)} />
                  <DetailRow label="Created" value={fmt(detail.createdAt)} />
                  <DetailRow label="Last attempt" value={fmt(detail.lastAttemptedAt)} />
                  <DetailRow label="Delivered" value={fmt(detail.deliveredAt)} />
                  <DetailRow label="Target" value={detail.targetLabel} />
                </div>

                {detail.lastError ? (
                  <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                    <p className="font-medium">Last error</p>
                    <p className="mt-1 whitespace-pre-wrap break-words">{detail.lastError}</p>
                  </div>
                ) : null}

                <div>
                  <p className="text-xs font-medium text-foreground/90">Payload preview (redacted)</p>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                    {JSON.stringify(detail.payloadPreview, null, 2)}
                  </pre>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" type="button" onClick={() => copyId(detail.id)}>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy id
                  </Button>
                  {detail.auditLogHref ? (
                    <Button size="sm" variant="outline" type="button" asChild>
                      <Link href={detail.auditLogHref}>Audit log</Link>
                    </Button>
                  ) : null}
                  {detail.status === "failed" || detail.status === "retrying" || detail.status === "pending" ? (
                    <Button size="sm" type="button" onClick={() => requestRetry([detail.id])}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      Retry
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(confirmRetry)} onOpenChange={(open) => !open && setConfirmRetry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm webhook retry</DialogTitle>
            <DialogDescription>
              Re-queue {confirmRetry?.ids.length ?? 0} event(s) as <strong>pending</strong> for the external delivery
              worker. Delivered events are never retried.
              {confirmRetry?.highAttempts
                ? " One or more events exceeded the safe attempt threshold — proceed only if the destination issue is resolved."
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="retry-note">Staff note (optional)</Label>
            <Textarea
              id="retry-note"
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
              rows={2}
              className="bg-secondary/30"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmRetry(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => confirmRetry && mutate("retry", confirmRetry.ids, confirmRetry.highAttempts)}
            >
              <Check className="mr-1 h-4 w-4" />
              Confirm retry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-foreground/90", mono && "font-mono text-[11px]")}>{value}</span>
    </div>
  );
}
