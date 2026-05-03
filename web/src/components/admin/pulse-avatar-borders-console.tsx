"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

import { grantPulseAvatarFrameAction } from "@/app/(admin)/admin/(console)/avatar-borders/actions";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminPulseAvatarFrameRow } from "@/lib/admin/pulse-avatar-frames-queries";
import { cn } from "@/lib/utils";

function formatMonth(iso: string): string {
  const d = new Date(`${iso.trim().slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function PulseAvatarBordersConsole({ frames }: { frames: AdminPulseAvatarFrameRow[] }) {
  const [userId, setUserId] = useState("");
  const [frameId, setFrameId] = useState("");
  const [alsoEquip, setAlsoEquip] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const options = useMemo(
    () =>
      frames.map((f) => ({
        ...f,
        monthLabel: formatMonth(f.month_start),
      })),
    [frames],
  );

  const selected = options.find((f) => f.id === frameId);

  return (
    <div className="space-y-6">
      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Gift a border</CardTitle>
          <p className="text-xs text-muted-foreground">
            Unlocks the catalog row for a user (same as earning it in-app). Optional: set it as their equipped border.
            Copy user ids from the{" "}
            <Link href="/admin/users" className="text-primary underline-offset-2 hover:underline">
              Users
            </Link>{" "}
            directory. Requires <code className="rounded bg-muted px-1 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> on the
            server so grants bypass RLS.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="gift-user-id">
              User id (UUID)
            </label>
            <Input
              id="gift-user-id"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setMessage(null);
              }}
              className="max-w-xl bg-secondary/40 font-mono text-sm"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="gift-frame">
              Border (full catalog)
            </label>
            <select
              id="gift-frame"
              className={cn(
                "h-10 w-full max-w-xl rounded-lg border border-input bg-secondary/40 px-3 text-sm",
                "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
              )}
              value={frameId}
              onChange={(e) => {
                setFrameId(e.target.value);
                setMessage(null);
              }}
            >
              <option value="">Select a border…</option>
              {options.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} · {f.prize_tier} · {f.monthLabel} · {f.slug}
                </option>
              ))}
            </select>
            {selected ? (
              <p className="max-w-xl text-xs text-muted-foreground">
                {selected.subtitle || "—"}
                {selected.ring_caption ? ` · Caption: ${selected.ring_caption}` : ""}
              </p>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              checked={alsoEquip}
              onChange={(e) => setAlsoEquip(e.target.checked)}
            />
            Also equip this border on their profile
          </label>

          {message ? (
            <p
              className={cn(
                "text-sm",
                message.type === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
              )}
              role="status"
            >
              {message.text}
            </p>
          ) : null}

          <Button
            type="button"
            disabled={pending || !userId.trim() || !frameId}
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const res = await grantPulseAvatarFrameAction({
                  targetUserId: userId.trim(),
                  frameId,
                  alsoEquip,
                });
                if (res.ok) {
                  setMessage({
                    type: "ok",
                    text: res.note ?? "Border granted. User can equip it under Customize My Pulse.",
                  });
                } else {
                  setMessage({ type: "err", text: res.error });
                }
              });
            }}
          >
            {pending ? "Working…" : "Grant border"}
          </Button>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Catalog ({frames.length})</CardTitle>
          <p className="text-xs text-muted-foreground">
            Every row in <code className="rounded bg-muted px-1">pulse_avatar_frames</code>. Add new designs via SQL
            migrations so releases stay reproducible.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Label</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Ring</TableHead>
                <TableHead>Glow</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frames.map((f) => (
                <TableRow key={f.id} className="border-border">
                  <TableCell className="font-medium">{f.label}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{f.slug}</TableCell>
                  <TableCell>{f.prize_tier}</TableCell>
                  <TableCell className="text-muted-foreground">{formatMonth(f.month_start)}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs" style={{ color: f.ring_color }}>
                      {f.ring_color}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{f.glow_color}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
