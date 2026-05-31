import { WebAppChrome, type WebAppRailCircle } from "@/components/web-app/web-app-chrome";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { getWebAppAccount } from "@/lib/web-app/account";
import { loadCirclesIndex } from "@/lib/web-app/circles-data";
import { usableExternalAppOrigin } from "@/lib/web-app-embed-policy";

export const dynamic = "force-dynamic";

export default async function WebAppLayout({ children }: { children: React.ReactNode }) {
  const account = await getWebAppAccount();

  // Signed out → render the page bare (the index renders the public landing;
  // protected sub-routes redirect to login on their own).
  if (!account) {
    return <>{children}</>;
  }

  const [locale, circlesResult] = await Promise.all([getMarketingLocale(), loadCirclesIndex()]);
  const copy = getWebAppPageCopy(locale);

  // Safe public circles for the right rail (pinned-first ordering from the loader).
  const trendingCircles: WebAppRailCircle[] =
    circlesResult.state === "ok"
      ? circlesResult.circles.slice(0, 5).map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }))
      : [];

  return (
    <WebAppChrome
      account={account}
      copy={copy.shell}
      externalAppBase={usableExternalAppOrigin()}
      trendingCircles={trendingCircles}
    >
      {children}
    </WebAppChrome>
  );
}
