import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/marketing/contact-form";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SectionHeader } from "@/components/marketing/section-header";
import { Button } from "@/components/ui/button";
import { canonical, m } from "@/lib/page-metadata";

export const metadata: Metadata = { ...m.contact, alternates: canonical("/contact") };

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const q = await searchParams;
  const sent = q.sent === "1";

  return (
    <MarketingPageShell width="form">
      <SectionHeader
        title="Contact"
        description="Partnerships, press, trust & safety, and early access — we read every note."
      />
      {sent ? (
        <div className="mt-10 space-y-4 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-8 text-center">
          <p className="text-lg font-semibold text-foreground">Message received</p>
          <p className="text-sm text-muted-foreground">Thanks — our team will get back to you shortly.</p>
          <Button asChild variant="outline" className="mt-2 border-white/20">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      ) : (
        <ContactForm />
      )}
    </MarketingPageShell>
  );
}
