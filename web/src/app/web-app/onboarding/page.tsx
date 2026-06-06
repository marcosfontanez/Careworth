import { redirect } from "next/navigation";

import { WebOnboardingWizard } from "@/components/web-app/web-onboarding-wizard";
import { getWebAppAccount } from "@/lib/web-app/account";

export const dynamic = "force-dynamic";

export default async function WebOnboardingPage() {
  const account = await getWebAppAccount();
  if (!account) {
    redirect("/login?next=%2Fweb-app%2Fonboarding");
  }
  if (!account.needsOnboarding) {
    redirect("/web-app/feed");
  }

  return (
    <WebOnboardingWizard
      initialDisplayName={account.displayName}
      initialUsername={account.username}
    />
  );
}
