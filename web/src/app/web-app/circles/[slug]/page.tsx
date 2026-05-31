import type { Metadata } from "next";

import { WebCircleDetail } from "@/components/web-app/web-circle-detail";
import { WebCircleUnavailable } from "@/components/web-app/web-circle-unavailable";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { loadCircleDetail } from "@/lib/web-app/circles-data";
import { resolveOpenInAppHref, usableExternalAppOrigin } from "@/lib/web-app-embed-policy";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/i;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: `${c.circles.indexTitle} · ${c.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function WebAppCircleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const account = await requireWebAppAccount(`/web-app/circles/${slug}`);
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);

  if (!SLUG_RE.test(slug)) {
    return (
      <WebCircleUnavailable
        title={c.circles.unavailableTitle}
        body={c.circles.unavailableBody}
        backLabel={c.circles.backToCircles}
      />
    );
  }

  const result = await loadCircleDetail(slug, account.id);

  if (result.state !== "ok") {
    return (
      <WebCircleUnavailable
        title={result.state === "error" ? c.circles.errorTitle : c.circles.unavailableTitle}
        body={result.state === "error" ? c.circles.errorBody : c.circles.unavailableBody}
        backLabel={c.circles.backToCircles}
      />
    );
  }

  const openAppHref = resolveOpenInAppHref(`/communities/${result.circle.slug}`);
  const isExternalApp = usableExternalAppOrigin() !== null;

  return (
    <WebCircleDetail
      circle={result.circle}
      isConfession={result.isConfession}
      threads={result.threads}
      copy={c.circles}
      openAppHref={openAppHref}
      isExternalApp={isExternalApp}
    />
  );
}
