import { notFound } from "next/navigation";

import { CampaignDetailEditor } from "@/components/admin/campaign-detail-editor";
import {
  isCampaignEditorEnabled,
  loadAdminCampaignById,
  loadCampaignAudit,
  loadCampaignOwnerOptions,
  loadKnownPlacements,
} from "@/lib/admin/campaign-editor";
import {
  isPlacementBookingEnabled,
  loadBookingsForCampaign,
  loadPlacementCatalog,
} from "@/lib/admin/placement-booking";
import { loadCampaignDeliveryReport } from "@/lib/admin/sponsored-delivery-reporting";

export default async function AdminCampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const [campaign, audit, owners, placements, editorEnabled, bookings, catalogPlacements, bookingEnabled] =
    await Promise.all([
      loadAdminCampaignById(id),
      loadCampaignAudit(id),
      loadCampaignOwnerOptions(),
      loadKnownPlacements(),
      isCampaignEditorEnabled(),
      loadBookingsForCampaign(id),
      loadPlacementCatalog(true),
      isPlacementBookingEnabled(),
    ]);

  if (!campaign) notFound();

  const { report, launchReadiness } = await loadCampaignDeliveryReport(campaign, bookings);

  return (
    <CampaignDetailEditor
      campaign={campaign}
      audit={audit}
      owners={owners}
      placements={placements}
      editorEnabled={editorEnabled}
      initialEdit={q.edit === "1"}
      bookings={bookings}
      catalogPlacements={catalogPlacements}
      bookingEnabled={bookingEnabled}
      deliveryReport={report}
      launchReadiness={launchReadiness}
    />
  );
}
