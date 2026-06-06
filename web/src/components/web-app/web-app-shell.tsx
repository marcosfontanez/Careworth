"use client";

import { usePathname } from "next/navigation";

import type { WebAppEngagementCopy, WebAppShellCopy } from "@/lib/marketing-copy/web-app";
import type { WebAppAccount } from "@/lib/web-app/account";

import { WebAppChrome, type WebAppRailCircle, type WebAppRailCreator } from "./web-app-chrome";
import { WebAppOnboardingGate } from "./web-app-onboarding-gate";

type Props = {
  account: WebAppAccount;
  copy: WebAppShellCopy;
  engagement: WebAppEngagementCopy;
  externalAppBase: string | null;
  trendingCircles: WebAppRailCircle[];
  suggestedCreators: WebAppRailCreator[];
  children: React.ReactNode;
};

export function WebAppShell({
  account,
  copy,
  engagement,
  externalAppBase,
  trendingCircles,
  suggestedCreators,
  children,
}: Props) {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/web-app/onboarding");

  if (isOnboarding) {
    return <>{children}</>;
  }

  return (
    <>
      <WebAppOnboardingGate needsOnboarding={account.needsOnboarding} />
      <WebAppChrome
        account={account}
        copy={copy}
        engagement={engagement}
        externalAppBase={externalAppBase}
        trendingCircles={trendingCircles}
        suggestedCreators={suggestedCreators}
      >
        {children}
      </WebAppChrome>
    </>
  );
}
