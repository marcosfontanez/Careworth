"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { grantShopCatalogItemAction } from "@/app/(admin)/admin/(console)/shop-catalog/actions";
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
import type { AdminShopBorderStats, AdminShopGrantLogRow, AdminShopItemRow } from "@/lib/admin/shop-catalog-queries";
import { cn } from "@/lib/utils";

const EMPTY_BORDER_STATS: AdminShopBorderStats = {
  owners: 0,
  acqPaid: 0,
  acqFree: 0,
  acqStaff: 0,
  acqTotal: 0,
};

function statusPill(item: AdminShopItemRow): { label: string; className: string } {
  if (!item.is_active) {
    return { label: "Inactive", className: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30" };
  }
  if (item.is_retired || item.availability_status === "retired" || item.availability_status === "legacy") {
    return { label: "Retired", className: "bg-muted text-muted-foreground" };
  }
  return { label: "Active", className: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/25" };
}

export function ShopCatalogConsole({
  items,
  recentGrants,
  borderStatsByItemId,
}: {
  items: AdminShopItemRow[];
  recentGrants: AdminShopGrantLogRow[];
  borderStatsByItemId: Record<string, AdminShopBorderStats>;
}) {
  const [recipient, setRecipient] = useState("");
  const [shopItemId, setShopItemId] = useState("");
  const [note, setNote] = useState("");
  const [idem, setIdem] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const grantable = useMemo(() => items.filter((i) => i.type === "border" || i.type === "spark_pack"), [items]);
  const selected = grantable.find((i) => i.id === shopItemId);

  return (
    <div className="space-y-8">
      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Grant a shop item</CardTitle>
          <p className="text-xs text-muted-foreground">
            Credits{" "}
            <strong className="font-medium text-foreground">promo Sparks</strong> for{" "}
            <code className="rounded bg-muted px-1 py-0.5">spark_pack</code> rows (same amounts as the IAP pack) and adds{" "}
            <code className="rounded bg-muted px-1 py-0.5">border</code> rows to{" "}
            <strong className="font-medium text-foreground">shop inventory</strong>. Recipient can be a UUID or @handle.
            Optional <strong className="font-medium text-foreground">idempotency key</strong> avoids double credits when
            you reuse the same key. Other catalog types are listed below but must be handled manually until automated.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="grant-recipient">
              User id or @handle
            </label>
            <Input
              id="grant-recipient"
              placeholder="xxxxxxxx-xxxx-… or @nursejanet"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setMessage(null);
              }}
              className="max-w-xl bg-secondary/40 font-mono text-sm"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              User directory:{" "}
              <Link href="/admin/users" className="text-primary underline-offset-2 hover:underline">
                /admin/users
              </Link>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="grant-item">
              Catalog item (borders &amp; Sparks packs)
            </label>
            <select
              id="grant-item"
              className={cn(
                "h-10 w-full max-w-xl rounded-lg border border-input bg-secondary/40 px-3 text-sm",
                "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
              )}
              value={shopItemId}
              onChange={(e) => {
                setShopItemId(e.target.value);
                setMessage(null);
              }}
            >
              <option value="">Select an item…</option>
              {grantable.map((i) => (
                <option key={i.id} value={i.id}>
                  [{i.type}] {i.name} · {i.slug}
                  {!i.is_active ? " · off-sale" : ""}
                </option>
              ))}
            </select>
            {selected ? (
              <p className="max-w-xl text-xs text-muted-foreground">
                iOS: {selected.store_product_id_ios ?? "—"} · Android: {selected.store_product_id_android ?? "—"}
                {selected.type === "spark_pack" && selected.spark_amount != null
                  ? ` · Pack size: ${selected.spark_amount} Sparks`
                  : null}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="grant-note">
              Internal note (optional)
            </label>
            <Input
              id="grant-note"
              placeholder="e.g. CX-4921 replacement"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="max-w-xl bg-secondary/40 text-sm"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="grant-idem">
              Idempotency key (optional)
            </label>
            <Input
              id="grant-idem"
              placeholder="Safe retry token — leave blank for a fresh grant"
              value={idem}
              onChange={(e) => setIdem(e.target.value)}
              className="max-w-xl bg-secondary/40 font-mono text-sm"
              autoComplete="off"
            />
          </div>

          {message ? (
            <p
              className={cn(
                "text-sm",
                message.type === "ok" ? "text-emerald-400" : "text-red-400",
              )}
              role="status"
            >
              {message.text}
            </p>
          ) : null}

          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const res = await grantShopCatalogItemAction({
                  recipientRaw: recipient,
                  shopItemId,
                  note: note || undefined,
                  idempotencyKey: idem || undefined,
                });
                if (res.ok) {
                  setMessage({
                    type: "ok",
                    text: res.detail ?? "Grant completed.",
                  });
                  setIdem("");
                } else {
                  setMessage({ type: "err", text: res.error });
                }
              });
            }}
          >
            {pending ? "Granting…" : "Grant item"}
          </Button>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Full catalog (SKU history)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Rows live in <code className="rounded bg-muted px-1 py-0.5">shop_items</code>. Prefer turning off sales with{" "}
            <strong className="font-medium text-foreground">is_active</strong>,{" "}
            <strong className="font-medium text-foreground">is_retired</strong>, or availability fields instead of
            deleting, so past SKUs stay auditable. For <code className="rounded bg-muted px-1 py-0.5">border</code> rows,
            <strong className="font-medium text-foreground"> Owners</strong> counts inventory rows (one per user).{" "}
            <strong className="font-medium text-foreground">Acquisitions</strong> count posted wallet credits:{" "}
            paid (IAP self or gift), free (shop promo claim), staff (admin grants and pending team gifts not yet opened).
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="tabular-nums text-right">Owners</TableHead>
                <TableHead className="tabular-nums text-right">Paid</TableHead>
                <TableHead className="tabular-nums text-right">Free</TableHead>
                <TableHead className="tabular-nums text-right">Staff</TableHead>
                <TableHead className="tabular-nums text-right">Total acq.</TableHead>
                <TableHead>Sparks / pack</TableHead>
                <TableHead>SKU (iOS)</TableHead>
                <TableHead>SKU (Android)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => {
                const pill = statusPill(i);
                const bs =
                  i.type === "border" ? (borderStatsByItemId[i.id] ?? EMPTY_BORDER_STATS) : null;
                const dash = "—";
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          pill.className,
                        )}
                      >
                        {pill.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{i.type}</TableCell>
                    <TableCell className="text-sm font-medium">{i.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{i.slug}</TableCell>
                    <TableCell className="tabular-nums text-right text-sm">
                      {bs ? bs.owners : dash}
                    </TableCell>
                    <TableCell className="tabular-nums text-right text-sm">
                      {bs ? bs.acqPaid : dash}
                    </TableCell>
                    <TableCell className="tabular-nums text-right text-sm">
                      {bs ? bs.acqFree : dash}
                    </TableCell>
                    <TableCell className="tabular-nums text-right text-sm">
                      {bs ? bs.acqStaff : dash}
                    </TableCell>
                    <TableCell className="tabular-nums text-right text-sm font-medium">
                      {bs ? bs.acqTotal : dash}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {i.type === "spark_pack" && i.spark_amount != null ? i.spark_amount : "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs" title={i.store_product_id_ios ?? ""}>
                      {i.store_product_id_ios ?? "—"}
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate font-mono text-xs"
                      title={i.store_product_id_android ?? ""}
                    >
                      {i.store_product_id_android ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Recent staff grants</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {recentGrants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No grants logged yet (run migration <code className="rounded bg-muted px-1">124_shop_catalog_admin_grants</code>{" "}
              if this stays empty after granting).
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When (UTC)</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentGrants.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {g.created_at?.replace("T", " ").slice(0, 19) ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {g.shop_items ? `${g.shop_items.name} (${g.shop_items.type})` : g.shop_item_id.slice(0, 8) + "…"}
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm">
                      <span className="text-foreground">{g.recipient_label}</span>
                      <div className="font-mono text-[10px] text-muted-foreground">{g.recipient_user_id}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm text-muted-foreground">{g.staff_label}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">{g.note ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
