"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, MoreHorizontal } from "lucide-react";

import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { ReportReason, ReportRow, ReportStatus, Severity } from "@/types/admin";
import { cn } from "@/lib/utils";

function formatReportId(id: string): string {
  return `#RPT-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function formatReason(reason: ReportReason): string {
  return reason.replace(/_/g, " ");
}

function formatStatusLabel(status: ReportStatus): string {
  switch (status) {
    case "under_review":
      return "In review";
    case "pending":
      return "New";
    default:
      return status.replace(/_/g, " ");
  }
}

function timeShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const reasonTone: Partial<Record<ReportReason, string>> = {
  misinformation: "border-violet-500/35 bg-violet-500/15 text-violet-200",
  harassment: "border-red-500/35 bg-red-500/15 text-red-200",
  spam: "border-emerald-500/35 bg-emerald-500/15 text-emerald-200",
  unsafe_medical: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  potential_phi: "border-rose-500/40 bg-rose-500/15 text-rose-100",
  live_incident: "border-orange-500/40 bg-orange-500/15 text-orange-100",
};

const severityDisplay: Record<Severity, string> = {
  critical: "High",
  high: "High",
  medium: "Medium",
  low: "Low",
};

type ModerationApiAction = "dismiss" | "uphold" | "review" | "warn" | "remove" | "suspend";

export function ModerationConsole({
  reports,
  initialReportId,
}: {
  reports: ReportRow[];
  initialReportId?: string | null;
}) {
  const router = useRouter();
  const [isActionPending, setIsActionPending] = useState(false);
  const computedSelectedId = useMemo(() => {
    if (reports.length === 0) return "";
    const fromQuery =
      initialReportId && reports.some((r) => r.id === initialReportId) ? initialReportId : null;
    return fromQuery ?? reports[0].id;
  }, [reports, initialReportId]);

  const [selectionOverride, setSelectionOverride] = useState<string | null>(null);

  const selectedId = useMemo(() => {
    if (selectionOverride && reports.some((r) => r.id === selectionOverride)) {
      return selectionOverride;
    }
    return computedSelectedId;
  }, [selectionOverride, reports, computedSelectedId]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [moderationNote, setModerationNote] = useState("");

  function selectReport(id: string) {
    setModerationNote("");
    setActionSuccess(null);
    setActionError(null);
    setSelectionOverride(id);
  }

  const selected = useMemo(() => reports.find((r) => r.id === selectedId) ?? reports[0], [reports, selectedId]);

  async function postModeration(
    action: ModerationApiAction,
    reportId: string,
    opts?: { banReason?: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        action,
        reportId,
        note: moderationNote.trim() || undefined,
        banReason: opts?.banReason,
      }),
    });
    let data: { ok?: boolean; error?: string } = {};
    try {
      data = (await res.json()) as { ok?: boolean; error?: string };
    } catch {
      return { ok: false, error: `Bad response (${res.status}). Is the dev server running?` };
    }
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  }

  async function runAction(
    label: string,
    action: ModerationApiAction,
    opts?: { banReason?: string },
  ) {
    setActionError(null);
    setActionSuccess(null);
    setIsActionPending(true);
    try {
      const result = await postModeration(action, selected.id, opts);
      if (!result.ok) {
        setActionError(result.error ?? "Action failed");
        return;
      }
      setActionSuccess(`${label} · saved`);
      router.refresh();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Network error. Check DevTools → Network → /api/admin/moderation",
      );
    } finally {
      setIsActionPending(false);
    }
  }

  if (!selected) {
    return (
      <div className="space-y-4 rounded-xl border border-white/10 bg-white/3 p-6 text-sm text-muted-foreground">
        <p>No open reports in the queue (nothing pending or in review).</p>
        <p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/reports">View full report history</Link>
          </Button>
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
      <AdminPanelCard className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base">Open reports queue</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {reports.length} need triage ·{" "}
              <Link href="/admin/reports" className="text-primary underline-offset-2 hover:underline">
                all history
              </Link>
            </p>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="More" type="button" disabled>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Content</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Reporter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Priority</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => {
                const active = r.id === selected.id;
                const reasonCls = reasonTone[r.reason] ?? "border-white/15 bg-white/6 text-muted-foreground";
                return (
                  <TableRow
                    key={r.id}
                    className={cn(
                      "cursor-pointer border-border transition-colors",
                      active ? "bg-primary/[0.12]" : "hover:bg-white/[0.04]",
                    )}
                    onClick={() => selectReport(r.id)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{formatReportId(r.id)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{r.preview}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                          reasonCls,
                        )}
                      >
                        {formatReason(r.reason)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{r.reporterName}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status === "pending" ? "pending" : r.status} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          r.severity === "critical" || r.severity === "high" ? "text-red-400" : "text-amber-200/90",
                        )}
                      >
                        {severityDisplay[r.severity]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{timeShort(r.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="border-t border-border px-4 py-3 text-center text-[11px] leading-snug text-muted-foreground">
            Rows are only <strong className="text-foreground/80">pending</strong> or{" "}
            <strong className="text-foreground/80">in review</strong>. After you Reject or Uphold, they leave this list
            (see Reports for closed items).
          </p>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard className="lg:col-span-2 lg:sticky lg:top-20">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {formatReportId(selected.id)}
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" asChild>
                <Link href={`/admin/reports`} aria-label="Open reports list">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-foreground/90">{selected.subjectMeta}</span>
            </p>
          </div>
          <StatusBadge status={selected.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          {actionSuccess ? (
            <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {actionSuccess}
            </p>
          ) : null}

          {actionError ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-200">
              {actionError}
            </p>
          ) : null}

          <div className="rounded-xl border border-white/10 bg-white/3 p-4 ring-1 ring-white/4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#0066ff] text-sm font-semibold text-white">
                {selected.subjectDisplayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{selected.subjectDisplayName}</p>
                <p className="text-xs text-muted-foreground">
                  Reported by {selected.reporterName} · {selected.type.replace("_", " ")} target
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-foreground/95">{selected.details}</p>
            {selected.staffNotes ? (
              <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/8 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">Staff notes</p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-amber-50/90">{selected.staffNotes}</p>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/20"
              disabled={isActionPending}
              onClick={() => runAction("Report rejected", "dismiss")}
            >
              {isActionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reject report
            </Button>
            <Button
              type="button"
              className="bg-emerald-600/90 text-white hover:bg-emerald-600"
              disabled={isActionPending}
              onClick={() => runAction("Report upheld", "uphold")}
            >
              Uphold &amp; close
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/20"
              disabled={isActionPending}
              onClick={() => {
                if (
                  !window.confirm(
                    "Remove this reported item from the database? (post, comment, or end live stream — cannot undo.)",
                  )
                )
                  return;
                runAction("Content removed", "remove");
              }}
            >
              Remove content
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-sky-500/35 text-sky-100"
              disabled={isActionPending}
              onClick={() => runAction("Warning recorded", "warn")}
            >
              Warn user
            </Button>
            <Button
              type="button"
              variant="outline"
              className="col-span-2 border-pv-gold/30 text-amber-100"
              disabled={isActionPending}
              onClick={() => runAction("Marked in review", "review")}
            >
              Mark reviewing
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="col-span-2"
              disabled={isActionPending}
              onClick={() => {
                const reason =
                  moderationNote.trim() ||
                  `Suspended from moderation · report ${selected.id.slice(0, 8)} · ${selected.reason}`;
                if (!window.confirm("Create a user_bans row for the reported subject and close this report?")) return;
                runAction("User suspended", "suspend", { banReason: reason });
              }}
            >
              Suspend user
            </Button>
          </div>

          <p className="text-[11px] leading-snug text-muted-foreground">
            <strong className="text-foreground/85">Reject</strong> = no violation (dismisses).{" "}
            <strong className="text-foreground/85">Uphold &amp; close</strong> = you agree with the report and close it (use Remove
            / Suspend first if you need a stronger action).
          </p>

          <div>
            <label className="text-xs text-muted-foreground" htmlFor="mod-internal-note">
              Internal note
            </label>
            <Textarea
              id="mod-internal-note"
              value={moderationNote}
              onChange={(e) => setModerationNote(e.target.value)}
              placeholder="Audit trail on this report (also used as ban reason for Suspend if left as the only context)."
              className="mt-1 min-h-[72px] border-white/10 bg-white/4 text-sm placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            <span>
              Status:{" "}
              <strong className="font-medium text-foreground">{formatStatusLabel(selected.status)}</strong>
            </span>
            <span>·</span>
            <span>
              Reason: <strong className="font-medium text-foreground">{formatReason(selected.reason)}</strong>
            </span>
            <span>·</span>
            <span>
              Target id: <strong className="font-medium text-foreground">{selected.targetId.slice(0, 36)}</strong>
            </span>
          </div>
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
