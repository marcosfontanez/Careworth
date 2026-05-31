import { WebAppChrome } from "@/components/web-app/web-app-chrome";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { getWebAppAccount } from "@/lib/web-app/account";
import { usableExternalAppOrigin } from "@/lib/web-app-embed-policy";

export const dynamic = "force-dynamic";

export default async function WebAppLayout({ children }: { children: React.ReactNode }) {
  const account = await getWebAppAccount();

  // Signed out → render the page bare (the index renders the public landing;
  // protected sub-routes redirect to login on their own).
  if (!account) {
    return <>{children}</>;
  }

  const locale = await getMarketingLocale();
  const copy = getWebAppPageCopy(locale);

  return (
    <WebAppChrome
      account={account}
      copy={copy.shell}
      externalAppBase={usableExternalAppOrigin()}
    >
      {children}
    </WebAppChrome>
  );
}
