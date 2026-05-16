import Link from "next/link";

import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserEconomyAudit } from "@/lib/admin/user-economy-queries";
import { cn } from "@/lib/utils";

function fmtUtc(iso: string): string {
  try {
    return iso.slice(0, 19).replace("T", " ");
  } catch {
    return iso;
  }
}

function metaPreview(meta: Record<string, unknown>): string {
  try {
    const s = JSON.stringify(meta);
    return s.length > 140 ? `${s.slice(0, 137)}…` : s;
  } catch {
    return "—";
  }
}

export function UserEconomyAuditPanel({ audit }: { audit: UserEconomyAudit }) {
  const { profile, sparkWallet, diamondWallet, walletLedger, purchaseReceipts, inventory, shopItemLabels } =
    audit;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/users">← Users directory</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/merchandising">Shop catalog</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminPanelCard className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sparks wallet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {sparkWallet ? (
              <dl className="grid gap-1 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Paid balance</dt>
                  <dd className="font-mono text-foreground">{sparkWallet.paid_sparks_balance}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Promo balance</dt>
                  <dd className="font-mono text-foreground">{sparkWallet.promo_sparks_balance}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Lifetime purchased</dt>
                  <dd className="font-mono text-foreground">{sparkWallet.total_sparks_purchased}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Lifetime spent</dt>
                  <dd className="font-mono text-foreground">{sparkWallet.total_sparks_spent}</dd>
                </div>
              </dl>
            ) : (
              <p>No spark wallet row (user may never have opened Pulse Shop).</p>
            )}
          </CardContent>
        </AdminPanelCard>

        <AdminPanelCard className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Diamonds wallet</CardTitle>
            <p className="text-xs text-muted-foreground">Creator rewards ledger balances.</p>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {diamondWallet ? (
              <dl className="grid gap-1 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Pending</dt>
                  <dd className="font-mono text-foreground">{diamondWallet.diamonds_pending}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Available</dt>
                  <dd className="font-mono text-foreground">{diamondWallet.diamonds_available}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Paid out</dt>
                  <dd className="font-mono text-foreground">{diamondWallet.diamonds_paid_out}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Total earned</dt>
                  <dd className="font-mono text-foreground">{diamondWallet.total_diamonds_earned}</dd>
                </div>
              </dl>
            ) : (
              <p>No creator diamond wallet (non-creator or never received gifts).</p>
            )}
          </CardContent>
        </AdminPanelCard>
      </div>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Wallet ledger</CardTitle>
          <p className="text-xs text-muted-foreground">
            Source of truth for Sparks, Diamonds, and border audit rows involving this account (
            <span className="font-mono">{profile?.id}</span>). Showing latest {walletLedger.length} rows (
            capped at 500).
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When (UTC)</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dir</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Idempotency</TableHead>
                <TableHead className="min-w-[12rem]">Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {walletLedger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    No ledger rows.
                  </TableCell>
                </TableRow>
              ) : (
                walletLedger.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{fmtUtc(row.created_at)}</TableCell>
                    <TableCell className="text-xs">{row.wallet_type}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs" title={row.transaction_type}>
                      {row.transaction_type}
                    </TableCell>
                    <TableCell className="text-xs">{row.direction}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{row.amount}</TableCell>
                    <TableCell className="text-xs">{row.status}</TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs" title={row.source_type ?? ""}>
                      {row.source_type ?? "—"}
                    </TableCell>
                    <TableCell
                      className="max-w-[120px] truncate font-mono text-[11px] text-muted-foreground"
                      title={row.idempotency_key ?? ""}
                    >
                      {row.idempotency_key ?? "—"}
                    </TableCell>
                    <TableCell
                      className="font-mono text-[11px] text-muted-foreground"
                      title={JSON.stringify(row.metadata)}
                    >
                      {metaPreview(row.metadata)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Store receipts (IAP)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Raw purchase receipts validated through Pulse Shop fulfillment — ties to App Store / Play product IDs.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Store product ID</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead>Shop item</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No receipts.
                  </TableCell>
                </TableRow>
              ) : (
                purchaseReceipts.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{fmtUtc(r.created_at)}</TableCell>
                    <TableCell className="text-xs">{r.platform}</TableCell>
                    <TableCell className="max-w-[240px] truncate font-mono text-xs" title={r.store_product_id}>
                      {r.store_product_id}
                    </TableCell>
                    <TableCell className="text-xs">{r.validation_status}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs" title={r.shop_item_id ?? ""}>
                      {r.shop_item_id ? (
                        shopItemLabels[r.shop_item_id] ?? r.shop_item_id
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Shop inventory</CardTitle>
          <p className="text-xs text-muted-foreground">Cosmetics acquired through IAP, gifts, promos, or admin grants.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acquired</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Gifted by</TableHead>
                <TableHead>Txn id</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No inventory rows.
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{fmtUtc(inv.acquired_at)}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs" title={inv.shop_item_id}>
                      {shopItemLabels[inv.shop_item_id] ?? inv.shop_item_id}
                    </TableCell>
                    <TableCell className="text-xs">{inv.item_kind}</TableCell>
                    <TableCell className="text-xs">{inv.acquisition_source}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {inv.gifted_by_user_id ?? "—"}
                    </TableCell>
                    <TableCell
                      className="max-w-[100px] truncate font-mono text-[11px] text-muted-foreground"
                      title={inv.acquisition_txn_id ?? ""}
                    >
                      {inv.acquisition_txn_id ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>

      <p className={cn("text-xs text-muted-foreground")}>
        Accounting exports: use Supabase SQL or extend this page with CSV. Ledger rows include{" "}
        <code className="rounded bg-muted px-1">idempotency_key</code> for dedupe traces.
      </p>
    </div>
  );
}
