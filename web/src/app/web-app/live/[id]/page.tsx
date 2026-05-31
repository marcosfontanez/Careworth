import type { Metadata } from "next";

import { WebCircleUnavailable } from "@/components/web-app/web-circle-unavailable";
import { WebLiveDetail } from "@/components/web-app/web-live-detail";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { loadWebLiveStream } from "@/lib/web-app/live-data";
import { resolveOpenInAppHref, usableExternalAppOrigin } from "@/lib/web-app-embed-policy";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: `${c.live.title} · ${c.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function WebAppLiveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await requireWebAppAccount(`/web-app/live/${id}`);
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);

  if (!UUID_RE.test(id)) {
    return (
      <WebCircleUnavailable
        title={c.live.detailUnavailableTitle}
        body={c.live.detailUnavailableBody}
        backLabel={c.live.backToLive}
        backHref="/web-app/live"
      />
    );
  }

  const result = await loadWebLiveStream(id, account.id);

  if (result.state !== "ok") {
    return (
      <WebCircleUnavailable
        title={result.state === "error" ? c.live.errorTitle : c.live.detailUnavailableTitle}
        body={result.state === "error" ? c.live.errorBody : c.live.detailUnavailableBody}
        backLabel={c.live.backToLive}
        backHref="/web-app/live"
      />
    );
  }

  const openAppHref = resolveOpenInAppHref(`/live/${result.stream.id}`);
  const isExternalApp = usableExternalAppOrigin() !== null;

  return (
    <WebLiveDetail
      stream={result.stream}
      status={result.status}
      others={result.others}
      copy={c.live}
      openAppHref={openAppHref}
      isExternalApp={isExternalApp}
    />
  );
}
