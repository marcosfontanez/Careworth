import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WebAppLanding } from "@/components/web-app/web-app-landing";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { getWebAppAccount } from "@/lib/web-app/account";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: c.metaTitle,
    description: c.metaDescription,
  };
}

export default async function WebAppPage() {
  const account = await getWebAppAccount();

  // Signed in → straight to the native Feed surface.
  if (account) {
    redirect("/web-app/feed");
  }

  // Signed out → polished public landing with a login CTA.
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return <WebAppLanding copy={c.landing} />;
}
