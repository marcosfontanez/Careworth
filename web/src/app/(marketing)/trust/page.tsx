import Link from "next/link";

import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SectionHeader } from "@/components/marketing/section-header";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { getSecurityEmail } from "@/lib/site-constants";
import { marketingCardMuted, marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export const generateMetadata = () => generateMarketingMetadata("trust");

const sections = [
  {
    title: "Healthcare-first moderation",
    body: "Queues, escalation, and appeals are designed for clinical debate, education, and creator safety — not generic social scale alone.",
  },
  {
    title: "Reporting & urgent incidents",
    body: "In-app reporting covers posts, profiles, and Live. For time-sensitive safety issues, use in-app flows and priority contact paths described in Help Center.",
  },
  {
    title: "Identity & authenticity",
    body: "Verification and professional context reduce impersonation and spam. Brand and partnership placements are labeled clearly where policy requires.",
  },
  {
    title: "PHI & clinical safety",
    body: "PulseVerse is not a system of record for patient-identifiable information. Never post PHI or individually identifiable patient details in public surfaces.",
  },
] as const;

export default function TrustPage() {
  const securityEmail = getSecurityEmail();

  return (
    <MarketingPageShell width="medium" breadcrumbPath="/trust">
      <SectionHeader
        eyebrow="Trust & safety"
        title="How we protect healthcare culture"
        description="A short overview of moderation, reporting, and safety expectations. For enforceable rules and privacy practices, see the documents linked below."
      />
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {sections.map((s) => (
          <div key={s.title} className={cn("rounded-2xl p-6", marketingCardMuted)}>
            <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-8 ring-1 ring-white/[0.04]">
        <p className="text-sm font-semibold text-foreground">Responsible disclosure</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          If you believe you have found a security vulnerability, contact{" "}
          <a href={`mailto:${securityEmail}`} className={marketingInlineLink}>
            {securityEmail}
          </a>
          . We publish machine-readable contact metadata in{" "}
          <Link href="/.well-known/security.txt" className={marketingInlineLink}>
            security.txt
          </Link>
          .
        </p>
      </div>
      <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-8 ring-1 ring-white/[0.04]">
        <p className="text-sm font-semibold text-foreground">Related</p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>
            <Link href="/community-guidelines" className={marketingInlineLink}>
              Community guidelines
            </Link>
          </li>
          <li>
            <Link href="/privacy" className={marketingInlineLink}>
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link href="/faq" className={marketingInlineLink}>
              FAQ
            </Link>
          </li>
          <li>
            <Link href="/support" className={marketingInlineLink}>
              Help center
            </Link>
          </li>
          <li>
            <Link href="/contact" className={marketingInlineLink}>
              Contact (trust &amp; safety, press, partnerships)
            </Link>
          </li>
        </ul>
      </div>
    </MarketingPageShell>
  );
}
