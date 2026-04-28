import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { Button } from "@/components/ui/button";
import { marketingCardMuted, shadowPrimaryCta } from "@/lib/ui-classes";
import { canonical, m } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { ...m.download, alternates: canonical("/download") };

export default function DownloadPage() {
  return (
    <MarketingPageShell width="medium">
      <SectionHeader
        eyebrow="Get the app"
        title="Join early access"
        description="CareWorth is rolling out to clinicians, students, and allied teams. Request access — we'll follow up with TestFlight / Play tracks as regions open."
      />
      <div className={cn("mt-12 rounded-2xl p-8", marketingCardMuted)}>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" className={cn("bg-primary text-primary-foreground", shadowPrimaryCta)} asChild>
            <Link href="/contact">Request invite</Link>
          </Button>
          <Button size="lg" variant="outline" className="border-white/15" asChild>
            <span className="cursor-not-allowed opacity-60">App Store (soon)</span>
          </Button>
          <Button size="lg" variant="outline" className="border-white/15" asChild>
            <span className="cursor-not-allowed opacity-60">Google Play (soon)</span>
          </Button>
        </div>
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
          Creator program: indicate on the contact form if you plan to host Live sessions or publish educational series —
          we&apos;ll prioritize moderator-ready cohorts.
        </p>
      </div>
    </MarketingPageShell>
  );
}
