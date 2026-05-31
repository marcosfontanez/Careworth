import type { Metadata } from "next";

import { WebFeed } from "@/components/web-app/web-feed";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { loadWebFeed, type WebFeedTab } from "@/lib/web-app/feed-data";
import { loadWebRail } from "@/lib/web-app/rail-data";
import { resolveOpenInAppHref, usableExternalAppOrigin } from "@/lib/web-app-embed-policy";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: `${c.feed.title} · ${c.metaTitle}`,
    // Personalized, authenticated surface — never indexed.
    robots: { index: false, follow: false },
  };
}

export default async function WebAppFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const account = await requireWebAppAccount("/web-app/feed");

  const { tab: tabParam } = await searchParams;
  const tab: WebFeedTab =
    tabParam === "top" ? "top" : tabParam === "following" ? "following" : "foryou";

  const [locale, result, rail] = await Promise.all([
    getMarketingLocale(),
    loadWebFeed(tab),
    loadWebRail(account.id),
  ]);
  const c = getWebAppPageCopy(locale);

  const openAppHref = resolveOpenInAppHref("/feed");
  const isExternalApp = usableExternalAppOrigin() !== null;

  return (
    <WebFeed
      tab={tab}
      result={result}
      copy={c.feed}
      engagement={c.engagement}
      shellCopy={c.shell}
      railCircles={rail.circles}
      railCreators={rail.creators}
      openAppHref={openAppHref}
      isExternalApp={isExternalApp}
      currentUserId={account.id}
    />
  );
}
