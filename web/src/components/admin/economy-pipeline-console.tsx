"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { KpiStatCard } from "@/components/admin/kpi-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCount } from "@/lib/admin/format";
import { computeEconomyProfitModel, formatUsd, type EconomyAssumptions } from "@/lib/admin/economy-math";
import type { EconomyPipelineSnapshot } from "@/types/admin-economy";

const axisStyle = { fill: "var(--muted-foreground)", fontSize: 11 };

function shortDay(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function displayHandle(username: string | null, displayName: string | null): string {
  if (username) return `@${username.replace(/^@/, "")}`;
  return displayName?.trim() || "Unknown";
}

export function EconomyPipelineConsole({ snapshot }: { snapshot: EconomyPipelineSnapshot }) {
  const [storeFeePercent, setStoreFeePercent] = useState(snapshot.defaultAssumptions.storeFeePercent);
  const [diamondUsdRate, setDiamondUsdRate] = useState(snapshot.defaultAssumptions.diamondUsdRate);
  const [payoutProcessorPercent, setPayoutProcessorPercent] = useState(
    snapshot.defaultAssumptions.payoutProcessorPercent,
  );

  const assumptions: EconomyAssumptions = useMemo(
    () => ({ storeFeePercent, diamondUsdRate, payoutProcessorPercent }),
    [storeFeePercent, diamondUsdRate, payoutProcessorPercent],
  );

  const profit = useMemo(
    () =>
      computeEconomyProfitModel({
        wallets: snapshot.wallets,
        sparkPackIap: snapshot.sparkPackIap,
        ledgerSparkPurchaseUnits: snapshot.ledger.sparkPurchaseUnits,
        ledgerGiftSparkUnits: snapshot.ledger.giftSparkUnits,
        sparksToDiamondsRatio: snapshot.settings.sparksToDiamondsRatio,
        assumptions,
      }),
    [snapshot, assumptions],
  );

  const chartDaily = useMemo(
    () =>
      snapshot.daily.map((d) => ({
        ...d,
        label: shortDay(d.day),
      })),
    [snapshot.daily],
  );

  const packChart = useMemo(
    () =>
      snapshot.sparkPackIap.map((p) => ({
        name: p.slug.replace(/^sparks-/, ""),
        purchases: p.validReceiptCount,
        grossUsd: (p.priceUsdCents * p.validReceiptCount) / 100,
      })),
    [snapshot.sparkPackIap],
  );

  if (!snapshot.loaded) {
    return (
      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Economy data unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{snapshot.error ?? "Could not load economy snapshot."}</p>
          {snapshot.error?.includes("migration 257") ? (
            <ol className="list-decimal space-y-2 pl-5 text-foreground/90">
              <li>Open Supabase → your project → SQL Editor.</li>
              <li>
                Run the migration file{" "}
                <code className="rounded bg-white/5 px-1 py-px">257_admin_economy_pipeline_summary.sql</code> from the
                repo.
              </li>
              <li>Refresh this page — you should see live Sparks pipeline metrics.</li>
            </ol>
          ) : null}
        </CardContent>
      </AdminPanelCard>
    );
  }

  const ratio = snapshot.settings.sparksToDiamondsRatio;
  const marginTone = profit.estimatedMarginPercent >= 20 ? "up" : profit.estimatedMarginPercent >= 0 ? "up" : "down";

  return (
    <div className="space-y-8">
      <AdminPanelCard className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profit model assumptions</CardTitle>
          <p className="text-xs text-muted-foreground">
            Cash-out is not live yet — adjust store fee and planned Diamond USD rate to stress-test margin. Ratio in DB:{" "}
            {ratio.sparks} Sparks → {ratio.diamonds} Diamonds ({profit.platformSparkSharePercent.toFixed(0)}% platform
            share on gifts).
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="store-fee">Apple / Google IAP fee</Label>
            <Select value={String(storeFeePercent)} onValueChange={(v) => setStoreFeePercent(Number(v))}>
              <SelectTrigger id="store-fee" className="border-white/10 bg-background/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15% (Small Business Program)</SelectItem>
                <SelectItem value="30">30% (standard)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="diamond-rate">Planned cash-out ($/Diamond)</Label>
            <Select value={String(diamondUsdRate)} onValueChange={(v) => setDiamondUsdRate(Number(v))}>
              <SelectTrigger id="diamond-rate" className="border-white/10 bg-background/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.005">$0.005</SelectItem>
                <SelectItem value="0.01">$0.01</SelectItem>
                <SelectItem value="0.015">$0.015</SelectItem>
                <SelectItem value="0.02">$0.02</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-fee">Payout processor fee</Label>
            <Select value={String(payoutProcessorPercent)} onValueChange={(v) => setPayoutProcessorPercent(Number(v))}>
              <SelectTrigger id="payout-fee" className="border-white/10 bg-background/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0% (ignore for now)</SelectItem>
                <SelectItem value="2.9">2.9% (Stripe-ish)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </AdminPanelCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          label="Gross Spark IAP"
          value={formatUsd(profit.grossIapUsdCents)}
          delta={`${snapshot.iap.validReceipts} valid receipts`}
          trend="up"
          accent="primary"
        />
        <KpiStatCard
          label="Net after store"
          value={formatUsd(profit.netIapUsdCents)}
          delta={`−${formatUsd(profit.storeFeeUsdCents)} store fee`}
          trend="up"
          accent="accent"
        />
        <KpiStatCard
          label="Diamond liability"
          value={formatUsd(profit.diamondLiabilityUsdCents)}
          delta={`${formatCount(snapshot.wallets.diamondAvailableTotal + snapshot.wallets.diamondPendingTotal)} pending+available`}
          trend="down"
          accent="amber"
        />
        <KpiStatCard
          label="Est. net profit"
          value={formatUsd(profit.estimatedNetProfitUsdCents)}
          delta={`${profit.estimatedMarginPercent.toFixed(1)}% of gross IAP`}
          trend={marginTone}
          accent={profit.estimatedNetProfitUsdCents >= 0 ? "violet" : "destructive"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminPanelCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Sparks purchased (ledger)" value={formatCount(snapshot.ledger.sparkPurchaseUnits)} />
            <Row label="Sparks gifted" value={formatCount(snapshot.ledger.giftSparkUnits)} />
            <Row label="Gift utilization" value={`${profit.giftUtilizationPercent.toFixed(1)}%`} />
            <Row label="Unspent paid Sparks" value={formatCount(snapshot.wallets.sparkPaidBalanceTotal)} />
            <Row label="Unspent promo Sparks" value={formatCount(snapshot.wallets.sparkPromoBalanceTotal)} />
            <Row
              label="Unspent float (est.)"
              value={formatUsd(profit.unspentPaidSparkFloatUsdCents)}
              hint="Paid balance × avg IAP spark price"
            />
            <Row label="Diamonds paid out" value={formatCount(snapshot.wallets.diamondPaidOutTotal)} />
            <Row label="Break-even $/Diamond" value={`$${profit.breakEvenDiamondUsdRate.toFixed(4)}`} />
            <Row label="Min cash-out (DB)" value={`${formatCount(snapshot.settings.minCashoutDiamonds)} Diamonds`} />
          </CardContent>
        </AdminPanelCard>

        <AdminPanelCard className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How profit is estimated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Net IAP</span> = valid Spark pack receipts × catalog price,
              minus the {storeFeePercent}% store fee you selected above.
            </p>
            <p>
              <span className="font-medium text-foreground">Diamond liability</span> = (available + pending Diamonds) ×
              your planned ${diamondUsdRate.toFixed(3)}/Diamond cash-out rate. This is future USD you may owe creators
              after KYC.
            </p>
            <p>
              <span className="font-medium text-foreground">Est. net profit</span> = Net IAP − Diamond liability −
              already paid out − payout processor fee. Unspent Sparks in wallets are upside (not counted as profit until
              spent or forfeited).
            </p>
            <p className="rounded-lg border border-white/8 bg-secondary/20 px-3 py-2 text-xs">
              Promo Sparks and staff grants cost near-zero IAP revenue but still create Diamond liability when gifted —
              watch promo volume in production.
            </p>
          </CardContent>
        </AdminPanelCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanelCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gifts &amp; Diamonds ({snapshot.daysWindow}d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartDaily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="giftCount" name="Gifts sent" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="diamondsEarned"
                  name="Diamonds earned"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </AdminPanelCard>

        <AdminPanelCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spark IAP purchases ({snapshot.daysWindow}d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartDaily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="iapArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="iapValidCount"
                  name="Valid IAP receipts"
                  stroke="var(--chart-3)"
                  fill="url(#iapArea)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </AdminPanelCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <AdminPanelCard className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spark pack revenue (all time)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={packChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                  formatter={(value, name) => {
                    if (name === "grossUsd") return [`$${Number(value).toFixed(2)}`, "Gross USD"];
                    return [value, "Purchases"];
                  }}
                />
                <Bar dataKey="purchases" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="Purchases" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </AdminPanelCard>

        <AdminPanelCard className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spark pack catalog &amp; IAP</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Pack</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Sparks</TableHead>
                  <TableHead className="text-right">Valid IAP</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.sparkPackIap.length ? (
                  snapshot.sparkPackIap.map((p) => (
                    <TableRow key={p.shopItemId} className="border-border">
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{formatUsd(p.priceUsdCents)}</TableCell>
                      <TableCell>{formatCount(p.sparkAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.validReceiptCount}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUsd(p.priceUsdCents * p.validReceiptCount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No spark_pack rows in catalog.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </AdminPanelCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanelCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top gifts sent</CardTitle>
            <p className="text-xs text-muted-foreground">{snapshot.gifts.totalSends} total sends</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Gift</TableHead>
                  <TableHead className="text-right">Sends</TableHead>
                  <TableHead className="text-right">Sparks</TableHead>
                  <TableHead className="text-right">Diamonds</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.topGifts.length ? (
                  snapshot.topGifts.map((g) => (
                    <TableRow key={g.slug} className="border-border">
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.sends}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCount(g.sparksSpent)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCount(g.diamondsEarned)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No gifts recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </AdminPanelCard>

        <AdminPanelCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Diamond earners</CardTitle>
            <p className="text-xs text-muted-foreground">
              Live {snapshot.gifts.liveSends} · Post {snapshot.gifts.postSends} · Profile {snapshot.gifts.profileSends}
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Creator</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.topEarners.length ? (
                  snapshot.topEarners.map((e) => (
                    <TableRow key={e.creatorId} className="border-border">
                      <TableCell className="font-medium">{displayHandle(e.username, e.displayName)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCount(e.diamondsEarned)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCount(e.diamondsAvailable)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-7 border-white/10" asChild>
                          <Link href={`/admin/users/${e.creatorId}`}>Audit</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No creator Diamond wallets yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </AdminPanelCard>
      </div>

      <AdminPanelCard>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ledger counters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-white/10">
            Spark purchases: {snapshot.ledger.sparkPurchases}
          </Badge>
          <Badge variant="outline" className="border-white/10">
            Promo credits: {snapshot.ledger.promoSparkCredits} ({formatCount(snapshot.ledger.promoSparkUnits)} Sparks)
          </Badge>
          <Badge variant="outline" className="border-white/10">
            Gift debits: {snapshot.ledger.giftDebits}
          </Badge>
          <Badge variant="outline" className="border-white/10">
            Diamond credits: {snapshot.ledger.diamondCredits}
          </Badge>
          <Badge variant="outline" className="border-white/10">
            IAP refunded: {snapshot.iap.refundedReceipts}
          </Badge>
          <Badge variant="outline" className="border-white/10">
            IAP pending: {snapshot.iap.pendingReceipts}
          </Badge>
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums text-foreground">
        {value}
        {hint ? <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{hint}</span> : null}
      </span>
    </div>
  );
}
