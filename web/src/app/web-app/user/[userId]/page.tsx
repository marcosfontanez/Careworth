import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WebProfile } from "@/components/web-app/web-profile";
import { WebProfileUnavailable } from "@/components/web-app/web-profile-unavailable";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { loadWebProfile } from "@/lib/web-app/profile-data";
import { resolveOpenInAppHref, usableExternalAppOrigin } from "@/lib/web-app-embed-policy";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: `${c.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function WebAppUserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const account = await requireWebAppAccount(`/web-app/user/${userId}`);
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);

  // Own profile → canonical My Pulse route.
  if (userId === account.id) redirect("/web-app/my-pulse");

  // Anonymous sentinel / malformed ids must never resolve to a real profile.
  if (!UUID_RE.test(userId)) {
    return (
      <WebProfileUnavailable
        title={c.profile.unavailableTitle}
        body={c.profile.unavailableBody}
        goToFeedLabel={c.profile.goToFeed}
      />
    );
  }

  const result = await loadWebProfile(userId, account.id);
  const openAppHref = resolveOpenInAppHref(`/profile/${userId}`);
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
      posts={result.posts}
      copy={c.profile}
      engagement={c.engagement}
      openAppHref={openAppHref}
      isExternalApp={isExternalApp}
    />
  );
}
