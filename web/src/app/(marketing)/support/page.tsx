import type { Metadata } from "next";

import { SupportCenterContent } from "@/components/marketing/support-center-content";
import { canonical, m } from "@/lib/page-metadata";

export const metadata: Metadata = { ...m.support, alternates: canonical("/support") };

export default function SupportPage() {
  return <SupportCenterContent />;
}
