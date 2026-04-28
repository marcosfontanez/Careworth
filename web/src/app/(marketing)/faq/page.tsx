import type { Metadata } from "next";

import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { marketingCardMuted } from "@/lib/ui-classes";
import { canonical, m } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { ...m.faq, alternates: canonical("/faq") };

const items = [
  {
    q: "Who is CareWorth for?",
    a: "Licensed or training healthcare professionals and aligned teams — from bedside to classroom — who want culture, not another corporate directory.",
  },
  {
    q: "Is CareWorth HIPAA-compliant?",
    a: "The product is designed with healthcare-grade trust and safety expectations. Specific compliance posture depends on your deployment and BAA needs — talk to us for enterprise health pathways.",
  },
  {
    q: "How does moderation work?",
    a: "Reports flow into trained moderator queues with severity, category, and live tooling. Appeals capture context for review.",
  },
  {
    q: "Can I use CareWorth for medical advice?",
    a: "No. Educational storytelling is welcome; individualized medical advice belongs in proper clinical channels. Community guidelines spell this out.",
  },
  {
    q: "How do Circles differ from subs?",
    a: "Circles are culture rooms with healthcare-native context — specialty, shift, humor, and education — not generic forums.",
  },
];

export default function FaqPage() {
  return (
    <MarketingPageShell width="tight">
      <SectionHeader title="FAQ" description="Quick answers for professionals considering CareWorth." />
      <div className={cn("mt-10 rounded-2xl border border-white/10 p-4 ring-1 ring-white/[0.04] sm:p-6", marketingCardMuted)}>
        <FaqAccordion items={items} />
      </div>
    </MarketingPageShell>
  );
}
