import { SupportCenterContent } from "@/components/marketing/support-center-content";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";

export const generateMetadata = () => generateMarketingMetadata("support");

export default async function SupportPage() {
  const locale = await getMarketingLocale();
  return <SupportCenterContent locale={locale} />;
}
