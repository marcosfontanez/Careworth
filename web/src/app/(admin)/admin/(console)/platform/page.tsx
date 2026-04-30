import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { CreatePartnerKeyForm } from "@/components/admin/create-partner-key-form";
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
import {
  loadComplianceTasks,
  loadFeatureFlags,
  loadPartnerApiKeys,
  loadPlatformCounts,
  loadWebhookOutboxRecent,
} from "@/lib/admin/platform-queries";

import {
  revokePartnerApiKeyForm,
  toggleComplianceTaskForm,
  toggleFeatureFlagForm,
} from "./actions";

export default async function AdminPlatformPage() {
  const [flags, keys, webhooks, tasks, counts] = await Promise.all([
    loadFeatureFlags(),
    loadPartnerApiKeys(),
    loadWebhookOutboxRecent(30),
    loadComplianceTasks(),
    loadPlatformCounts(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Platform" }]}
        title="Platform & enterprise"
        description="Feature flags, partner API keys, webhook queue, compliance checklist, and operational counters. Apply migration 067_platform_enterprise_foundation.sql for full schema."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-card/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Experiments</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.experiments}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sponsor deals (CRM)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.deals}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fraud queue (open)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.fraudOpen}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trust score rows</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.trustScores}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Warehouse runs</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.warehouseRuns}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/40 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Webhooks pending</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.pendingWebhooks}</p>
        </div>
      </div>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Feature flags</CardTitle>
          <p className="text-xs text-muted-foreground">Toggle capabilities before wiring workers (webhooks, experiments).</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flags loaded (run migration 067 or check RLS).</p>
          ) : (
            flags.map((f) => (
              <div
                key={f.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/8 bg-secondary/20 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{f.key}</p>
                  {f.description ? <p className="text-xs text-muted-foreground">{f.description}</p> : null}
                </div>
                <form action={toggleFeatureFlagForm}>
                  <input type="hidden" name="key" value={f.key} />
                  <input type="hidden" name="enabled" value={f.enabled ? "false" : "true"} />
                  <Button type="submit" size="sm" variant={f.enabled ? "outline" : "default"}>
                    {f.enabled ? "Disable" : "Enable"}
                  </Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Partner API keys</CardTitle>
          <p className="text-xs text-muted-foreground">
            Hashed at rest. Enable <span className="text-foreground/90">partner_api</span> then call{" "}
            <code className="rounded bg-white/5 px-1">GET /api/partner/v1/health</code> with{" "}
            <code className="rounded bg-white/5 px-1">Authorization: Bearer …</code>.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <CreatePartnerKeyForm />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.length ? (
                keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.label}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{k.keyPrefix}…</TableCell>
                    <TableCell className="text-xs">{k.revokedAt ? "Revoked" : "Active"}</TableCell>
                    <TableCell className="text-right">
                      {!k.revokedAt ? (
                        <form action={revokePartnerApiKeyForm} className="inline">
                          <input type="hidden" name="id" value={k.id} />
                          <Button type="submit" size="sm" variant="destructive">
                            Revoke
                          </Button>
                        </form>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No keys yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Webhook outbox (recent)</CardTitle>
          <p className="text-xs text-muted-foreground">Rows enqueue from moderation actions; delivery worker is separate.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.length ? (
                webhooks.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="max-w-[200px] truncate text-xs font-mono">{w.eventType}</TableCell>
                    <TableCell className="text-xs">{w.status}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{w.attempts}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(w.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No webhooks yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </AdminPanelCard>

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Compliance program (checklist)</CardTitle>
          <p className="text-xs text-muted-foreground">Operational tasks — not legal advice. Track readiness for enterprise reviews.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks (run migration 067).</p>
          ) : (
            tasks.map((t) => {
              const done = Boolean(t.completedAt);
              return (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 bg-secondary/15 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.category}</p>
                  </div>
                  <form action={toggleComplianceTaskForm}>
                    <input type="hidden" name="taskId" value={t.id} />
                    <input type="hidden" name="done" value={done ? "false" : "true"} />
                    <Button type="submit" size="sm" variant={done ? "outline" : "default"}>
                      {done ? "Mark incomplete" : "Mark done"}
                    </Button>
                  </form>
                </div>
              );
            })
          )}
        </CardContent>
      </AdminPanelCard>

      <p className="text-xs text-muted-foreground">
        Related schema: user analytics consent, profile <code className="rounded bg-white/5 px-1">preferred_locale</code>,{" "}
        experiments, sponsor deals, fraud queue, warehouse runs, placement trust scores — see migration 067. Staff can
        edit <code className="rounded bg-white/5 px-1">preferred_locale</code> and digest email on{" "}
        <Link href="/admin/settings" className="font-medium text-primary underline hover:no-underline">
          Settings
        </Link>
        .
      </p>
    </div>
  );
}
