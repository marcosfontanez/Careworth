import { AppJsonLd } from "@/components/json-ld";
import { MarketingAuthHashRedirect } from "@/components/auth/marketing-auth-hash-redirect";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav, type MarketingAccountChip } from "@/components/marketing/marketing-nav";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { getMarketingViewer } from "@/lib/marketing-viewer-server";
import { organizationAndWebsiteGraph } from "@/lib/structured-data";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  /* Both reuse the request-cached viewer, so the auth + profiles lookup happens
     once per render (shared with every page's getMarketingLocale call). */
  const [locale, viewer] = await Promise.all([getMarketingLocale(), getMarketingViewer()]);
  const account: MarketingAccountChip = viewer
    ? {
        userId: viewer.userId,
        displayName: viewer.displayName,
        username: viewer.username,
      }
    : null;

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <MarketingAuthHashRedirect />
      <AppJsonLd data={organizationAndWebsiteGraph()} />
      <MarketingNav locale={locale} account={account} />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 outline-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(45,127,249,0.08),transparent_55%)]"
      >
        {children}
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
