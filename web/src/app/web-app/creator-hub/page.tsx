import type { Metadata } from "next";

import { WebCreatorHub } from "@/components/web-app/web-creator-hub";
import { WebProfileUnavailable } from "@/components/web-app/web-profile-unavailable";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { loadWebProfile } from "@/lib/web-app/profile-data";
import { resolveOpenInAppHref, usableExternalAppOrigin } from "@/lib/web-app-embed-policy";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: `${c.creatorHub.title} · ${c.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function WebAppCreatorHubPage() {
  const account = await requireWebAppAccount("/web-app/creator-hub");
  const [locale, result] = await Promise.all([
    getMarketingLocale(),
    loadWebProfile(account.id, account.id),
  ]);
  const c = getWebAppPageCopy(locale);
  const openAppHref = resolveOpenInAppHref("/creator-hub");
  const isExternalApp = usableExternalAppOrigin() !== null;

  if (result.state !== "ok") {
    return (
      <WebProfileUnavailable
        title={c.profile.errorTitle}
        body={c.profile.errorBody}
        goToFeedLabel={c.profile.goToFeed}
      />
    );
  }

  return (
    <WebCreatorHub
      profile={result.profile}
      posts={result.posts}
      copy={c.creatorHub}
      openAppHref={openAppHref}
      isExternalApp={isExternalApp}
      openPostLabel={c.profile.openPost}
    />
  );
}
