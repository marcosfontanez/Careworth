import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { StaffPreferencesForm } from "@/components/admin/staff-preferences-form";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        description="Staff preferences and read-only diagnostics. Remote feature flags and policy toggles ship with the mobile app — this console does not flip production behavior yet."
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
      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Platform feature controls</CardTitle>
          <CardDescription>
            Roadmap: strict live review, PHI auto-queue, creator fund, and sponsored surfaces will surface here when wired
            to Supabase config or a policy service. No switches are active today — avoids confusing staff with mock UI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use <span className="font-medium text-foreground">Moderation</span> and{" "}
            <span className="font-medium text-foreground">Trust</span> insights for operational workflow; product
            defaults remain in the mobile app and database migrations.
          </p>
        </CardContent>
      </AdminPanelCard>
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
