import { AppJsonLd } from "@/components/json-ld";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { organizationAndWebsiteGraph } from "@/lib/structured-data";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getMarketingLocale();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <AppJsonLd data={organizationAndWebsiteGraph()} />
      <MarketingNav locale={locale} />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
