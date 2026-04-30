import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { StaffPreferencesForm } from "@/components/admin/staff-preferences-form";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { loadRecentAnalyticsEvents } from "@/lib/admin/queries";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { FileClock } from "lucide-react";

async function loadStaffProfilePrefs(): Promise<{ preferredLocale: Locale; productDigestEmail: boolean } | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("preferred_locale, product_digest_email")
      .eq("id", user.id)
      .maybeSingle();
    if (!data) return null;
    const preferredLocale = isLocale(data.preferred_locale) ? data.preferred_locale : DEFAULT_LOCALE;
    return {
      preferredLocale,
      productDigestEmail: Boolean(data.product_digest_email),
    };
  } catch {
    return null;
  }
}

export default async function AdminSettingsPage() {
  const [events, staffPrefs] = await Promise.all([loadRecentAnalyticsEvents(30), loadStaffProfilePrefs()]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Settings" }]}
        title="Settings"
        description="Platform controls — connect moderation policy and feature flags to your backend when ready."
      />
      {staffPrefs ? (
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
            <CardDescription>
              Preferences stored on your PulseVerse profile (same schema as mobile). Applies to this staff user only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StaffPreferencesForm
              preferredLocale={staffPrefs.preferredLocale}
              productDigestEmail={staffPrefs.productDigestEmail}
            />
          </CardContent>
        </AdminPanelCard>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Moderation defaults</CardTitle>
            <CardDescription>
              Visual toggles only until wired to your policy service. Turning options here does not change production
              behavior yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="live-flag">Strict live review</Label>
              <Switch id="live-flag" disabled />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="appeal-auto">Auto-queue PHI risk</Label>
              <Switch id="appeal-auto" defaultChecked disabled />
            </div>
          </CardContent>
        </AdminPanelCard>
        <AdminPanelCard>
          <CardHeader>
            <CardTitle>Product flags</CardTitle>
            <CardDescription>Mirror mobile feature flags from your remote config when integrated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="creator-fund">Creator fund</Label>
              <Switch id="creator-fund" disabled />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="ads">Sponsored surfaces</Label>
              <Switch id="ads" defaultChecked disabled />
            </div>
          </CardContent>
        </AdminPanelCard>
      </div>
      <AdminPanelCard>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileClock className="h-4 w-4 text-primary" aria-hidden />
            <CardTitle>Recent product events</CardTitle>
          </div>
          <CardDescription>
            Latest rows from <span className="font-mono text-xs">analytics_events</span> (read-only). For a full audit
            trail, export to your SIEM or add a dedicated admin audit table.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {events.length ? (
            events.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-1 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="font-medium text-foreground">{row.event_name}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                  {row.user_id ? ` · ${String(row.user_id).slice(0, 8)}…` : ""}
                </p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">
              No analytics events yet, or Supabase env not configured. Events appear here as the mobile app records them.
            </p>
          )}
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
