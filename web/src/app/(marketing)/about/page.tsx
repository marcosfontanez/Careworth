import type { Metadata } from "next";

import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingCardMuted } from "@/lib/ui-classes";
import { canonical, m } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { ...m.about, alternates: canonical("/about") };

const pillars = [
  {
    title: "Mission",
    body: "Strengthen culture, connection, and credible storytelling across clinical life — without reducing people to credentials alone.",
  },
  {
    title: "Vision",
    body: "A trusted surface where Feed, Circles, Live, and Pulse Page — with Current Vibe, My Pulse, and Media Hub — layer together for growth, moderation, and creator dignity.",
  },
  {
    title: "Principles",
    body: "Premium dark-native UX, healthcare-first moderation, and room for humor beside hard truths.",
  },
] as const;

export default function AboutPage() {
  return (
    <MarketingPageShell width="medium" breadcrumbPath="/about">
      <SectionHeader
        eyebrow="About"
        title="Social infrastructure for healthcare culture"
        description="PulseVerse exists because healthcare professionals deserve a network that feels as alive as the work — without being reduced to a line on a directory."
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.title} className={cn("rounded-2xl p-6", marketingCardMuted)}>
            <h2 className="text-lg font-semibold text-foreground">{p.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-8 ring-1 ring-white/[0.04]">
        <p className="text-lg leading-relaxed text-muted-foreground">
          We are not building hospital software or a stiff professional graph. We&apos;re building the cultural layer
          clinicians never had — serious about trust, expressive about identity, and readable at 2 a.m. on night shift.
        </p>
      </div>
    </MarketingPageShell>
  );
}
