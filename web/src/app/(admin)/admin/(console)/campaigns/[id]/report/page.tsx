import { notFound } from "next/navigation";

import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SponsorSafeReportView } from "@/components/admin/sponsor-safe-report-view";
import { SponsoredDeliveryCsvExport } from "@/components/admin/sponsored-delivery-csv-export";
import { PrintPageButton } from "@/components/admin/print-page-button";
import { Button } from "@/components/ui/button";
import { loadAdminCampaignById } from "@/lib/admin/campaign-editor";
import { loadBookingsForCampaign } from "@/lib/admin/placement-booking";
import { loadCampaignDeliveryReport } from "@/lib/admin/sponsored-delivery-reporting";

export default async function AdminCampaignSponsorReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [campaign, bookings] = await Promise.all([loadAdminCampaignById(id), loadBookingsForCampaign(id)]);
  if (!campaign) notFound();

  const { report, sponsorReport } = await loadCampaignDeliveryReport(campaign, bookings);
  const generatedAt = new Date().toISOString();

  return (
    <div className="space-y-8 print:space-y-4">
      <div className="print:hidden">
        <AdminPageHeader
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Campaigns", href: "/admin/campaigns" },
            { label: campaign.campaignName, href: `/admin/campaigns/${id}` },
            { label: "Sponsor report" },
          ]}
          title="Sponsor-safe report"
          description="Safe to export or screenshot for partners. No internal notes, budget, or staff data."
          actions={
            <div className="flex flex-wrap gap-2">
              <SponsoredDeliveryCsvExport rows={[report]} />
              <Button size="sm" variant="outline" className="border-white/15" asChild>
                <Link href={`/admin/campaigns/${id}`}>Campaign detail</Link>
              </Button>
              <PrintPageButton />
            </div>
          }
        />
      </div>
      <SponsorSafeReportView report={sponsorReport} generatedAt={generatedAt} />
    </div>
  );
}
