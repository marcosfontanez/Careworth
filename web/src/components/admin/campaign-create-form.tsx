"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  CampaignFormFields,
  CampaignFormSubmitBar,
  emptyCampaignFormValues,
  formValuesFromPrefill,
  formValuesToInput,
  type CampaignFormValues,
} from "@/components/admin/campaign-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPanelCard } from "@/components/admin/admin-panel-card";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CampaignLeadPrefill, CampaignOwnerOption } from "@/lib/admin/campaign-editor-shared";
import { cn } from "@/lib/utils";

type Props = {
  owners: CampaignOwnerOption[];
  placements: string[];
  editorEnabled: boolean;
  leadPrefill?: CampaignLeadPrefill | null;
};

export function CampaignCreateForm({ owners, placements, editorEnabled, leadPrefill }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<CampaignFormValues>(() =>
    leadPrefill ? formValuesFromPrefill(leadPrefill) : emptyCampaignFormValues(),
  );
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: "ok" | "err"; message: string } | null>(null);
  const [loadingLead, setLoadingLead] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("leadId")?.trim();
    if (!leadId || leadPrefill) return;
    setLoadingLead(true);
    void fetch(`/api/admin/campaigns?leadId=${encodeURIComponent(leadId)}`)
      .then((r) => r.json())
      .then((data: { ok?: boolean; prefill?: CampaignLeadPrefill }) => {
        if (data.ok && data.prefill) setValues(formValuesFromPrefill(data.prefill));
      })
      .finally(() => setLoadingLead(false));
  }, [leadPrefill]);

  if (!editorEnabled) {
    return (
      <div className="space-y-4">
        <AdminPageHeader
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Campaigns", href: "/admin/campaigns" },
            { label: "New" },
          ]}
          title="Create campaign"
          description="Editor disabled"
        />
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Enable <span className="font-mono">admin_campaign_editor_enabled</span> on Platform to create campaigns.
        </p>
        <Button asChild variant="outline" className="border-white/15">
          <Link href="/admin/campaigns">Back</Link>
        </Button>
      </div>
    );
  }

  async function submit() {
    setToast(null);
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", campaign: formValuesToInput(values) }),
    });
    const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
    if (!res.ok || !data.ok || !data.id) {
      setToast({ tone: "err", message: data.error ?? "Create failed." });
      return;
    }
    setToast({ tone: "ok", message: "Campaign created." });
    startTransition(() => router.push(`/admin/campaigns/${data.id}`));
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Campaigns", href: "/admin/campaigns" },
          { label: "New" },
        ]}
        title="Create campaign"
        description="New records default to draft. No public ad delivery is enabled by this form."
        actions={
          <Button size="sm" variant="outline" className="border-white/15" asChild>
            <Link href="/admin/campaigns">Cancel</Link>
          </Button>
        }
      />

      {leadPrefill ? (
        <p className="text-xs text-muted-foreground">
          Pre-filled from lead inquiry · contact {leadPrefill.contactEmail}
        </p>
      ) : null}

      {toast ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            toast.tone === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-100",
          )}
        >
          {toast.message}
        </p>
      ) : null}

      <AdminPanelCard>
        <CardHeader>
          <CardTitle>Campaign details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingLead ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <CampaignFormFields
                values={values}
                onChange={setValues}
                owners={owners}
                placements={placements}
                showStatus={false}
              />
              <CampaignFormSubmitBar pending={pending} label="Create campaign" onSubmit={() => void submit()} />
            </>
          )}
        </CardContent>
      </AdminPanelCard>
    </div>
  );
}
