import type { Metadata } from "next";

import { WebProfile } from "@/components/web-app/web-profile";
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
    title: `${c.profile.ownerTitle} · ${c.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function WebAppMyPulsePage() {
  const account = await requireWebAppAccount("/web-app/my-pulse");
  const [locale, result] = await Promise.all([
    getMarketingLocale(),
    loadWebProfile(account.id, account.id),
  ]);
  const c = getWebAppPageCopy(locale);
  const openAppHref = resolveOpenInAppHref("/my-pulse");
  const isExternalApp = usableExternalAppOrigin() !== null;

  if (result.state !== "ok") {
    return (
      <WebProfileUnavailable
        title={result.state === "error" ? c.profile.errorTitle : c.profile.unavailableTitle}
        body={result.state === "error" ? c.profile.errorBody : c.profile.unavailableBody}
        goToFeedLabel={c.profile.goToFeed}
      />
    );
  }

  return (
    <WebProfile
      profile={result.profile}
      isOwner={result.isOwner}
      contentVisible={result.contentVisible}
      lockReason={result.lockReason}
      canFollow={result.canFollow}
      isFollowing={result.isFollowing}
      pulseUpdates={result.pulseUpdates}
      media={result.media}
      copy={c.profile}
      engagement={c.engagement}
      openAppHref={openAppHref}
      isExternalApp={isExternalApp}
    />
  );
}
