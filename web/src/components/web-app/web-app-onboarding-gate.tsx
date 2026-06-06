"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Redirect signed-in users who still need onboarding (web mirror of native gate). */
export function WebAppOnboardingGate({ needsOnboarding }: { needsOnboarding: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!needsOnboarding) return;
    if (pathname.startsWith("/web-app/onboarding")) return;
    router.replace("/web-app/onboarding");
  }, [needsOnboarding, pathname, router]);

  return null;
}
