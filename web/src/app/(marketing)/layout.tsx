import { AppJsonLd } from "@/components/json-ld";
import { MarketingAuthHashRedirect } from "@/components/auth/marketing-auth-hash-redirect";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { organizationAndWebsiteGraph } from "@/lib/structured-data";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  /* Locale is a pure cookie read (no network). The signed-in account chip is
     resolved client-side inside <MarketingNav> after paint, so the public
     marketing shell renders with ZERO Supabase auth/DB work in the SSR critical
     path — the single biggest TTFB lever for the homepage. */
  const locale = await getMarketingLocale();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <MarketingAuthHashRedirect />
      <AppJsonLd data={organizationAndWebsiteGraph()} />
      <MarketingNav locale={locale} />
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
