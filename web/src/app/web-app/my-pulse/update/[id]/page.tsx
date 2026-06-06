import type { Metadata } from "next";

import { WebProfileUnavailable } from "@/components/web-app/web-profile-unavailable";
import { WebPulseUpdateDetail } from "@/components/web-app/web-pulse-update-detail";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { loadWebPulseUpdate } from "@/lib/web-app/pulse-update-data";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: `${c.profile.pulseUpdatesTitle} · ${c.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function WebAppPulseUpdatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const { id } = await params;
  const { focus } = await searchParams;
  const account = await requireWebAppAccount(`/web-app/my-pulse/update/${id}`);
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);

  const unavailable = (
    <WebProfileUnavailable
      title={c.profile.unavailableTitle}
      body={c.profile.unavailableBody}
      goToFeedLabel={c.profile.goToFeed}
    />
  );

  if (!UUID_RE.test(id)) return unavailable;

  const result = await loadWebPulseUpdate(id, account.id);
  if (result.state !== "ok") return unavailable;

  const backHref =
    result.update.userId === account.id
      ? "/web-app/my-pulse"
      : `/web-app/user/${result.update.userId}`;

  return (
    <WebPulseUpdateDetail
      update={result.update}
      comments={result.comments}
      copy={c.profile}
      backHref={backHref}
      focusComments={focus === "comments"}
    />
  );
}
