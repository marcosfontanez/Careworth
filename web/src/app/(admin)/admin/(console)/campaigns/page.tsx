import { CampaignEditorConsole } from "@/components/admin/campaign-editor-console";
import {
  isCampaignEditorEnabled,
  loadAdminCampaigns,
  loadCampaignOwnerOptions,
  loadKnownPlacements,
  parseCampaignEditorFilters,
} from "@/lib/admin/campaign-editor";

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseCampaignEditorFilters(sp);

  const [list, owners, placements, editorEnabled] = await Promise.all([
    loadAdminCampaigns(filters),
    loadCampaignOwnerOptions(),
    loadKnownPlacements(),
    isCampaignEditorEnabled(),
  ]);

  return (
    <CampaignEditorConsole
      campaigns={list.campaigns}
      total={list.total}
      filters={filters}
      owners={owners}
      placements={placements}
      editorEnabled={editorEnabled}
    />
  );
}
