import { CampaignCreateForm } from "@/components/admin/campaign-create-form";
import {
  isCampaignEditorEnabled,
  loadCampaignOwnerOptions,
  loadKnownPlacements,
  loadLeadPrefill,
} from "@/lib/admin/campaign-editor";

export default async function AdminCampaignNewPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const q = await searchParams;
  const leadId = q.leadId?.trim();

  const [owners, placements, editorEnabled, leadPrefill] = await Promise.all([
    loadCampaignOwnerOptions(),
    loadKnownPlacements(),
    isCampaignEditorEnabled(),
    leadId ? loadLeadPrefill(leadId) : Promise.resolve(null),
  ]);

  return (
    <CampaignCreateForm
      owners={owners}
      placements={placements}
      editorEnabled={editorEnabled}
      leadPrefill={leadPrefill}
    />
  );
}
