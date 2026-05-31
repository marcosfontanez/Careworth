import type { Metadata } from "next";

import { WebCreate } from "@/components/web-app/web-create";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { resolveOpenInAppHref, usableExternalAppOrigin } from "@/lib/web-app-embed-policy";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: `${c.create.title} · ${c.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export default async function WebAppCreatePage() {
  await requireWebAppAccount("/web-app/create");
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  const isExternalApp = usableExternalAppOrigin() !== null;

  return (
    <WebCreate
      copy={c.create}
      myPulseHref="/web-app/my-pulse"
      imageHref={resolveOpenInAppHref("/create/image")}
      videoHref={resolveOpenInAppHref("/create/video")}
      circleHref={resolveOpenInAppHref("/circles")}
      isExternalApp={isExternalApp}
    />
  );
}
