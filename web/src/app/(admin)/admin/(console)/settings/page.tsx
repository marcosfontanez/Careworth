import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileClock } from "lucide-react";

const mockAuditTail = [
  { id: "1", at: "2026-04-27 15:01", action: "Strict live review toggled off", actor: "lead_taylor" },
  { id: "2", at: "2026-04-27 11:40", action: "Circle featured order updated", actor: "ops_api" },
  { id: "3", at: "2026-04-26 09:12", action: "PHI auto-queue sensitivity raised", actor: "trust_policy" },
];

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Settings" }]}
        title="Settings"
        description="Platform controls — feature flags and policy placeholders."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Moderation defaults</CardTitle>
            <CardDescription>Auto-hold thresholds, PHI pattern lists — wire to policy service.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="live-flag">Strict live review</Label>
              <Switch id="live-flag" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="appeal-auto">Auto-queue PHI risk</Label>
              <Switch id="appeal-auto" defaultChecked />
            </div>
          </CardContent>
        </AdminPanelCard>
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Product flags</CardTitle>
            <CardDescription>Mirror mobile feature flag service when connected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="creator-fund">Creator fund</Label>
              <Switch id="creator-fund" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="ads">Sponsored surfaces</Label>
              <Switch id="ads" defaultChecked />
            </div>
          </CardContent>
        </AdminPanelCard>
      </div>
      <AdminPanelCard>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileClock className="h-4 w-4 text-primary" aria-hidden />
            <CardTitle>Audit tail</CardTitle>
          </div>
          <CardDescription>Placeholder stream — wire to immutable audit log / SIEM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {mockAuditTail.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-1 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="font-medium text-foreground">{row.action}</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {row.at} · {row.actor}
              </p>
            </div>
          ))}
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
