import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EconomyPipelineConsole } from "@/components/admin/economy-pipeline-console";
import { Button } from "@/components/ui/button";
import { loadEconomyPipelineSnapshot } from "@/lib/admin/economy-queries";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ days?: string }>;
};

export default async function AdminEconomyPage(props: Props) {
  const { days: daysRaw } = await props.searchParams;
  const daysParsed = Number.parseInt(daysRaw ?? "90", 10);
  const days = Number.isFinite(daysParsed) ? Math.min(Math.max(daysParsed, 7), 365) : 90;

  const snapshot = await loadEconomyPipelineSnapshot(days);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Sparks economy" },
        ]}
        title="Sparks pipeline & profit model"
        description="Live Pulse Shop economy — IAP revenue, gift flow, Diamond liability, and estimated net margin after store fees and planned creator cash-out."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href="/admin/merchandising">Shop &amp; borders</Link>
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href={`/admin/economy?days=30`}>30d charts</Link>
            </Button>
            <Button size="sm" variant="outline" className="border-white/15" asChild>
              <Link href={`/admin/economy?days=90`}>90d charts</Link>
            </Button>
          </div>
        }
      />
      <EconomyPipelineConsole snapshot={snapshot} />
    </div>
  );
}
