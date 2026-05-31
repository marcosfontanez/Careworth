import type { Metadata } from "next";

import { WebLive } from "@/components/web-app/web-live";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { loadWebLive } from "@/lib/web-app/live-data";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: `${c.live.title} · ${c.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function WebAppLivePage() {
  const account = await requireWebAppAccount("/web-app/live");
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);

  const result = await loadWebLive(account.id);

  return <WebLive result={result} copy={c.live} />;
}
