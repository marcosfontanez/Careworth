import type { Metadata } from "next";

import { WebShop } from "@/components/web-app/web-shop";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { loadWebShop } from "@/lib/web-app/shop-data";
import { resolveOpenInAppHref, usableExternalAppOrigin } from "@/lib/web-app-embed-policy";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: `${c.shop.title} · ${c.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function WebAppShopPage() {
  const account = await requireWebAppAccount("/web-app/shop");
  const [locale, result] = await Promise.all([
    getMarketingLocale(),
    loadWebShop(account.id),
  ]);
  const c = getWebAppPageCopy(locale);

  return (
    <WebShop
      result={result}
      copy={c.shop}
      purchaseHref={resolveOpenInAppHref("/shop")}
      isExternalApp={usableExternalAppOrigin() !== null}
    />
  );
}
