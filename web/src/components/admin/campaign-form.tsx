"use client";

import type { CampaignInput, CampaignLeadPrefill, CampaignOwnerOption, CampaignStatus } from "@/lib/admin/campaign-editor-shared";
import { CAMPAIGN_STATUSES, INVENTORY_PLANNING_DISCLAIMER } from "@/lib/admin/campaign-editor-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type CampaignFormValues = {
  campaignName: string;
  advertiserName: string;
  placement: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  objective: string;
  budgetTotal: string;
  ownerId: string;
  leadId: string;
  internalNotes: string;
  targetAudienceNotes: string;
  creativeNotes: string;
  confirmLockedEdit: boolean;
};

export function emptyCampaignFormValues(overrides?: Partial<CampaignFormValues>): CampaignFormValues {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return {
    campaignName: "",
    advertiserName: "",
    placement: "",
    status: "draft",
    startDate: fmt(today),
    endDate: fmt(end),
    objective: "",
    budgetTotal: "",
    ownerId: "",
    leadId: "",
    internalNotes: "",
    targetAudienceNotes: "",
    creativeNotes: "",
    confirmLockedEdit: false,
    ...overrides,
  };
}

export function formValuesFromPrefill(prefill: CampaignLeadPrefill): CampaignFormValues {
  const notes = [
    prefill.topic ? `Inquiry topic: ${prefill.topic}` : null,
    prefill.sourceHost ? `Source: ${prefill.sourceHost}` : null,
    `Contact: ${prefill.contactName} <${prefill.contactEmail}>`,
    prefill.internalNotes,
  ]
    .filter(Boolean)
    .join("\n");
  return emptyCampaignFormValues({
    advertiserName: prefill.advertiserName,
    campaignName: prefill.topic ? `${prefill.advertiserName} — ${prefill.topic}` : `${prefill.advertiserName} campaign`,
    leadId: prefill.leadId,
    internalNotes: notes,
    objective: prefill.topic ?? "Partnership inquiry follow-up",
  });
}

export function formValuesToInput(values: CampaignFormValues): CampaignInput {
  return {
    campaignName: values.campaignName,
    advertiserName: values.advertiserName,
    placement: values.placement,
    status: values.status,
    startDate: values.startDate,
    endDate: values.endDate,
    objective: values.objective,
    budgetTotal: values.budgetTotal ? Number(values.budgetTotal) : 0,
    ownerId: values.ownerId || null,
    leadId: values.leadId || null,
    internalNotes: values.internalNotes || null,
    targetAudienceNotes: values.targetAudienceNotes || null,
    creativeNotes: values.creativeNotes || null,
    confirmLockedEdit: values.confirmLockedEdit,
  };
}

type Props = {
  values: CampaignFormValues;
  onChange: (next: CampaignFormValues) => void;
  owners: CampaignOwnerOption[];
  placements: string[];
  locked?: boolean;
  showStatus?: boolean;
};

export function CampaignFormFields({
  values,
  onChange,
  owners,
  placements,
  locked = false,
  showStatus = true,
}: Props) {
  const set = (patch: Partial<CampaignFormValues>) => onChange({ ...values, ...patch });

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs leading-relaxed text-amber-100/90">
        {INVENTORY_PLANNING_DISCLAIMER}
      </div>
      <p className="text-xs text-muted-foreground">
        Campaign records are internal planning only. Setting status to <span className="text-foreground/90">active</span>{" "}
        does not enable public ad delivery — in-app sponsored posts remain gated by the mobile{" "}
        <span className="font-mono text-[11px]">sponsoredPosts</span> flag.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="campaignName">Campaign name *</Label>
          <Input
            id="campaignName"
            value={values.campaignName}
            onChange={(e) => set({ campaignName: e.target.value })}
            placeholder="Q3 nurse education flight"
            disabled={locked}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="advertiserName">Advertiser / brand *</Label>
          <Input
            id="advertiserName"
            value={values.advertiserName}
            onChange={(e) => set({ advertiserName: e.target.value })}
            disabled={locked}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="placement">Placement *</Label>
          <Input
            id="placement"
            list="campaign-placements"
            value={values.placement}
            onChange={(e) => set({ placement: e.target.value })}
            placeholder="In-feed sponsored"
            disabled={locked}
          />
          <datalist id="campaign-placements">
            {placements.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        {showStatus ? (
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={values.status}
              onChange={(e) => set({ status: e.target.value as CampaignStatus })}
              className="flex h-9 w-full rounded-md border border-white/12 bg-background/80 px-3 text-sm outline-none ring-primary/20 focus:ring-2"
              disabled={locked}
            >
              {CAMPAIGN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Start date *</Label>
          <Input
            id="startDate"
            type="date"
            value={values.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
            disabled={locked}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">End date *</Label>
          <Input
            id="endDate"
            type="date"
            value={values.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
            disabled={locked}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="objective">Objective *</Label>
          <Input
            id="objective"
            value={values.objective}
            onChange={(e) => set({ objective: e.target.value })}
            placeholder="Brand awareness, lead gen, event promotion…"
            disabled={locked}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="budgetTotal">Budget (optional)</Label>
          <Input
            id="budgetTotal"
            type="number"
            min={0}
            step="0.01"
            value={values.budgetTotal}
            onChange={(e) => set({ budgetTotal: e.target.value })}
            disabled={locked}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ownerId">Staff owner</Label>
          <select
            id="ownerId"
            value={values.ownerId}
            onChange={(e) => set({ ownerId: e.target.value })}
            className="flex h-9 w-full rounded-md border border-white/12 bg-background/80 px-3 text-sm outline-none ring-primary/20 focus:ring-2"
            disabled={locked}
          >
            <option value="">Unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="leadId">Linked lead ID</Label>
          <Input
            id="leadId"
            value={values.leadId}
            onChange={(e) => set({ leadId: e.target.value })}
            placeholder="UUID from /admin/leads"
            disabled={locked}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="targetAudienceNotes">Target audience notes</Label>
          <Textarea
            id="targetAudienceNotes"
            rows={2}
            value={values.targetAudienceNotes}
            onChange={(e) => set({ targetAudienceNotes: e.target.value })}
            disabled={locked}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="creativeNotes">Creative notes</Label>
          <Textarea
            id="creativeNotes"
            rows={2}
            value={values.creativeNotes}
            onChange={(e) => set({ creativeNotes: e.target.value })}
            disabled={locked}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="internalNotes">Internal notes</Label>
          <Textarea
            id="internalNotes"
            rows={3}
            value={values.internalNotes}
            onChange={(e) => set({ internalNotes: e.target.value })}
            disabled={locked}
          />
        </div>
        {locked ? (
          <label className="flex items-center gap-2 text-xs text-amber-200 sm:col-span-2">
            <input
              type="checkbox"
              checked={values.confirmLockedEdit}
              onChange={(e) => set({ confirmLockedEdit: e.target.checked })}
            />
            I confirm editing this completed/cancelled campaign
          </label>
        ) : null}
      </div>
    </div>
  );
}

export function CampaignFormSubmitBar({
  pending,
  label,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  label: string;
  onSubmit: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <Button type="button" onClick={onSubmit} disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
      {onCancel ? (
        <Button type="button" variant="outline" className="border-white/15" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}
