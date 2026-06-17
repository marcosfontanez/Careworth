import { SponsoredDeliveryReportingConsole } from "@/components/admin/sponsored-delivery-reporting-console";
import {
  loadSponsoredDeliveryReportingDashboard,
  parseSponsoredReportingFilters,
} from "@/lib/admin/sponsored-delivery-reporting";

export default async function AdminSponsoredDeliveryReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseSponsoredReportingFilters(sp);
  const data = await loadSponsoredDeliveryReportingDashboard(filters);

  return (
    <SponsoredDeliveryReportingConsole
      rows={data.rows}
      total={data.total}
      filters={filters}
      platformDeliveryEnabled={data.platformDeliveryEnabled}
      placements={data.placements}
    />
  );
}
