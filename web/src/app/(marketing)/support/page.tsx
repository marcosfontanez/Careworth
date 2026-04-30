import type { Metadata } from "next";

import { SupportCenterContent } from "@/components/marketing/support-center-content";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { canonical, m } from "@/lib/page-metadata";

export const metadata: Metadata = { ...m.support, alternates: canonical("/support") };

export default async function SupportPage() {
  const locale = await getMarketingLocale();
  return <SupportCenterContent locale={locale} />;
}
