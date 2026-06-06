import { WebAppShell } from "@/components/web-app/web-app-shell";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { getWebAppAccount } from "@/lib/web-app/account";
import { loadWebRail } from "@/lib/web-app/rail-data";
import { usableExternalAppOrigin } from "@/lib/web-app-embed-policy";

export const dynamic = "force-dynamic";

export default async function WebAppLayout({ children }: { children: React.ReactNode }) {
  const account = await getWebAppAccount();

  // Signed out → render the page bare (the index renders the public landing;
  // protected sub-routes redirect to login on their own).
  if (!account) {
    return <>{children}</>;
  }

  const [locale, rail] = await Promise.all([getMarketingLocale(), loadWebRail(account.id)]);
  const copy = getWebAppPageCopy(locale);

  return (
    <WebAppShell
      account={account}
      copy={copy.shell}
      engagement={copy.engagement}
      externalAppBase={usableExternalAppOrigin()}
      trendingCircles={rail.circles}
      suggestedCreators={rail.creators}
    >
      {children}
    </WebAppShell>
  );
}
