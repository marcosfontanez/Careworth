"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  banUserAction,
  grantStaffAction,
  liftBanAction,
  revokeStaffAction,
  suspendUserAction,
  toggleVerifiedAction,
} from "@/app/(admin)/admin/user-admin-actions";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import type { AdminUserDetail } from "@/lib/admin/user-admin-mutations";

type Props = {
  detail: AdminUserDetail;
  currentStaffUserId: string;
  canManageStaff: boolean;
  canModerateUsers: boolean;
};

export function UserAdminDetailPanels({
  detail,
  currentStaffUserId,
  canManageStaff,
  canModerateUsers,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [dialog, setDialog] = useState<
    | null
    | { kind: "grant_staff" | "revoke_staff" | "verify_on" | "verify_off" | "ban" | "suspend" | "lift_ban" }
  >(null);
  const [reason, setReason] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [typedConfirm, setTypedConfirm] = useState("");
  const [suspendDays, setSuspendDays] = useState("7");

  const p = detail.profile;
  const isSelf = p.id === currentStaffUserId;
  const isBanned = Boolean(detail.activeBan);

  function run(action: () => Promise<{ ok: boolean; error?: string; banner?: string }>) {
    setMessage(null);
    start(async () => {
      const res = await action();
      if (!res.ok) {
        setMessage({ type: "err", text: res.error ?? "Action failed" });
        return;
      }
      setMessage({ type: "ok", text: res.banner ?? "Action completed." });
      setDialog(null);
      setReason("");
      setStaffNote("");
      setTypedConfirm("");
      router.refresh();
    });
  }

  const revokeNeedsTyped = dialog?.kind === "revoke_staff" && p.roleAdmin;

  return (
    <div className="space-y-6">
      {message ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${message.type === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      <AdminPanelCard>
        <CardHeader>
          <CardTitle className="text-base">Profile summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <StatusBadge status={p.roleAdmin ? "resolved" : "pending"} />
          {p.roleAdmin ? <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-200">Staff</span> : null}
          {p.staffRoles.length ? (
            <span className="text-xs text-muted-foreground">Roles: {p.staffRoles.join(", ")}</span>
          ) : null}
          {p.isVerified ? <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-200">Verified</span> : null}
          {isBanned ? <StatusBadge status="banned" /> : <StatusBadge status="active" />}
          <span className="text-muted-foreground">Joined {new Date(p.createdAt).toLocaleDateString()}</span>
          <span className="text-muted-foreground">· {p.followerCount.toLocaleString()} followers</span>
          <span className="text-muted-foreground">· {p.postCount.toLocaleString()} posts</span>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle className="text-base">Admin controls</CardTitle>
          <p className="text-xs text-muted-foreground">
            Staff access grants entry to the web admin portal and mobile admin panel.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {canManageStaff && !p.roleAdmin ? (
            <Button size="sm" disabled={pending} onClick={() => setDialog({ kind: "grant_staff" })}>
              Grant staff
            </Button>
          ) : null}
          {canManageStaff && p.roleAdmin ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={pending || (isSelf && detail.staffCount <= 1)}
              onClick={() => setDialog({ kind: "revoke_staff" })}
            >
              Revoke staff
            </Button>
          ) : null}
          {canModerateUsers ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setDialog({ kind: p.isVerified ? "verify_off" : "verify_on" })}
            >
              {p.isVerified ? "Remove verified badge" : "Grant verified badge"}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/audit">View audit log</Link>
          </Button>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle className="text-base">Enforcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.activeBan ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm">
              <p className="font-medium text-red-200">Active ban / suspension</p>
              <p className="text-muted-foreground">{detail.activeBan.reason}</p>
              <p className="text-xs text-muted-foreground">
                Since {new Date(detail.activeBan.createdAt).toLocaleString()}
                {detail.activeBan.expiresAt
                  ? ` · expires ${new Date(detail.activeBan.expiresAt).toLocaleString()}`
                  : " · permanent"}
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {canModerateUsers && !isBanned ? (
              <>
                <Button size="sm" variant="destructive" disabled={pending} onClick={() => setDialog({ kind: "ban" })}>
                  Ban user
                </Button>
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => setDialog({ kind: "suspend" })}>
                  Suspend user
                </Button>
              </>
            ) : null}
            {canModerateUsers && isBanned ? (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setDialog({ kind: "lift_ban" })}>
                Lift ban
              </Button>
            ) : null}
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/moderation">Open moderation</Link>
            </Button>
          </div>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle className="text-base">Reports &amp; moderation history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Reports against user</p>
            <MiniReportTable rows={detail.reportsAgainstUser} empty="No reports against this user." />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Reports by user</p>
            <MiniReportTable rows={detail.reportsByUser} empty="No reports filed by this user." />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Staff audit (recent)</p>
            {detail.moderationAudit.length ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {detail.moderationAudit.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <span className="text-foreground">{a.action}</span> · {new Date(a.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No audit rows for this user yet.</p>
            )}
          </div>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle className="text-base">Recent posts</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.recentPosts.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caption</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.recentPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="max-w-xs truncate">{post.caption ?? "—"}</TableCell>
                    <TableCell>{post.privacyMode ?? "public"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No recent posts.</p>
          )}
        </CardContent>
      </AdminPanelCard>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "grant_staff" && "Grant staff access"}
              {dialog?.kind === "revoke_staff" && "Revoke staff access"}
              {dialog?.kind === "verify_on" && "Grant verified badge"}
              {dialog?.kind === "verify_off" && "Remove verified badge"}
              {dialog?.kind === "ban" && "Ban user"}
              {dialog?.kind === "suspend" && "Suspend user"}
              {dialog?.kind === "lift_ban" && "Lift ban"}
            </DialogTitle>
          </DialogHeader>
          {(dialog?.kind === "ban" || dialog?.kind === "suspend") && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (required)</Label>
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
              {dialog?.kind === "suspend" && (
                <>
                  <Label htmlFor="days">Duration (days)</Label>
                  <Input id="days" type="number" min={1} max={365} value={suspendDays} onChange={(e) => setSuspendDays(e.target.value)} />
                </>
              )}
            </div>
          )}
          {revokeNeedsTyped ? (
            <div className="space-y-2">
              <p className="text-sm text-amber-200">Type REVOKE to confirm revoking staff from {p.displayName}.</p>
              <Input value={typedConfirm} onChange={(e) => setTypedConfirm(e.target.value)} placeholder="REVOKE" />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="staff_note">Internal staff note (optional)</Label>
            <Textarea id="staff_note" value={staffNote} onChange={(e) => setStaffNote(e.target.value)} rows={2} />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" type="button" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={dialog?.kind === "ban" || dialog?.kind === "revoke_staff" ? "destructive" : "default"}
              disabled={
                pending ||
                (revokeNeedsTyped && typedConfirm !== "REVOKE") ||
                ((dialog?.kind === "ban" || dialog?.kind === "suspend") && !reason.trim())
              }
              onClick={() => {
                if (!dialog) return;
                switch (dialog.kind) {
                  case "grant_staff":
                    run(() => grantStaffAction(p.id, staffNote));
                    break;
                  case "revoke_staff":
                    run(() => revokeStaffAction(p.id, staffNote));
                    break;
                  case "verify_on":
                    run(() => toggleVerifiedAction(p.id, true, staffNote));
                    break;
                  case "verify_off":
                    run(() => toggleVerifiedAction(p.id, false, staffNote));
                    break;
                  case "ban":
                    run(() => banUserAction(p.id, reason, staffNote));
                    break;
                  case "suspend":
                    run(() => suspendUserAction(p.id, reason, Number(suspendDays) || 7, staffNote));
                    break;
                  case "lift_ban":
                    run(() => liftBanAction(p.id, staffNote));
                    break;
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniReportTable({
  rows,
  empty,
}: {
  rows: AdminUserDetail["reportsAgainstUser"];
  empty: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.slice(0, 8).map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.targetType}</TableCell>
            <TableCell>{r.reason}</TableCell>
            <TableCell>{r.status}</TableCell>
            <TableCell className="text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
