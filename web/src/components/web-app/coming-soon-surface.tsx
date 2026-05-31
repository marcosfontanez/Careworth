import { getWebAppPageCopy, type WebAppNavKey } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { requireWebAppAccount } from "@/lib/web-app/account";
import { resolveOpenInAppHref, usableExternalAppOrigin } from "@/lib/web-app-embed-policy";

import { WebAppComingSoon } from "./web-app-coming-soon";

type Surface = Exclude<WebAppNavKey, "feed">;

/** expo-router path inside the full app, used for the "Open in app" deep link. */
const APP_PATH: Record<Surface, string> = {
  circles: "/circles",
  live: "/live",
  myPulse: "/my-pulse",
  creatorHub: "/create",
  notifications: "/notifications",
  settings: "/settings",
};

/** Native Next.js route, used to send signed-out visitors back here after login. */
const ROUTE_PATH: Record<Surface, string> = {
  circles: "/web-app/circles",
  live: "/web-app/live",
  myPulse: "/web-app/my-pulse",
  creatorHub: "/web-app/creator-hub",
  notifications: "/web-app/notifications",
  settings: "/web-app/settings",
};

export async function ComingSoonSurface({ surface }: { surface: Surface }) {
  await requireWebAppAccount(ROUTE_PATH[surface]);
  const locale = await getMarketingLocale();
  const copy = getWebAppPageCopy(locale);
  const openAppHref = resolveOpenInAppHref(APP_PATH[surface]);
  const isExternalApp = usableExternalAppOrigin() !== null;
  return (
    <WebAppComingSoon
      copy={copy.comingSoon[surface]}
      openAppHref={openAppHref}
      isExternalApp={isExternalApp}
    />
  );
}
