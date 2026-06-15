"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { decideAppeal, type AppealDecisionMode } from "@/app/(admin)/admin/appeal-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AppealRow } from "@/types/admin";

export function AppealRowActions({ appeal }: { appeal: AppealRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [staffNote, setStaffNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const closed = appeal.status === "accepted" || appeal.status === "denied";
  const canAutoRestore = Boolean(appeal.postId && appeal.postPrivacyMode === "private");

  function run(mode: AppealDecisionMode) {
    setErr(null);
    setBanner(null);
    start(async () => {
      const res = await decideAppeal(appeal.id, mode, {
        staffNote,
        rejectionReason: mode === "reject" ? rejectionReason : undefined,
      });
      if (!res.ok) {
        setErr(res.error ?? "Update failed");
        return;
      }
      setBanner(res.banner ?? "Appeal updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 border-t border-white/10 pt-3">
      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <p>
          <span className="font-medium text-foreground/90">Target:</span> {appeal.actionTaken}
        </p>
        <p>
          <span className="font-medium text-foreground/90">Enforcement state:</span>{" "}
          {appeal.postId ? (appeal.postPrivacyMode === "private" ? "Hidden (private)" : appeal.postPrivacyMode ?? "public") : "No linked post"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`staff-note-${appeal.id}`}>Internal staff note</Label>
        <Textarea
          id={`staff-note-${appeal.id}`}
          value={staffNote}
          onChange={(e) => setStaffNote(e.target.value)}
          rows={2}
          className="bg-secondary/30"
          disabled={closed || pending}
        />
      </div>

      {err ? <p className="text-xs text-red-300">{err}</p> : null}
      {banner ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">{banner}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" type="button" disabled={pending || closed} onClick={() => run("reviewing")}>
          Mark reviewing
        </Button>
        {canAutoRestore ? (
          <Button
            size="sm"
            className="bg-primary text-primary-foreground"
            type="button"
            disabled={pending || closed}
            onClick={() => run("approve_restore")}
          >
            Approve &amp; restore
          </Button>
        ) : (
          <Button
            size="sm"
            className="bg-primary text-primary-foreground"
            type="button"
            disabled={pending || closed}
            onClick={() => run("approve_manual")}
          >
            Approve — manual restore required
          </Button>
        )}
        <Button size="sm" variant="secondary" type="button" disabled={pending || closed} onClick={() => run("reject")}>
          Reject
        </Button>
      </div>

      {!closed ? (
        <div className="space-y-2">
          <Label htmlFor={`reject-${appeal.id}`}>Rejection reason (shown in audit if rejecting)</Label>
          <Textarea
            id={`reject-${appeal.id}`}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={2}
            className="bg-secondary/30"
            disabled={pending}
          />
        </div>
      ) : null}
    </div>
  );
}
