import type { Metadata } from "next";

import { ComingSoonSurface } from "@/components/web-app/coming-soon-surface";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function WebAppSettingsPage() {
  return <ComingSoonSurface surface="settings" />;
}
