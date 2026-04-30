import type { Metadata } from "next";
import Link from "next/link";

import { LegalDoc } from "@/components/marketing/legal-doc";
import { canonical, m } from "@/lib/page-metadata";
import { getLegalNotice, legalDocumentsLastUpdatedDisplay } from "@/lib/site-constants";
import { marketingInlineLink } from "@/lib/ui-classes";

export const metadata: Metadata = { ...m.terms, alternates: canonical("/terms") };

const toc = [
  { id: "intro", label: "Introduction" },
  { id: "eligibility", label: "Eligibility" },
  { id: "license", label: "License to operate" },
  { id: "acceptable", label: "Acceptable use" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "termination", label: "Termination" },
];

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Service" toc={toc} breadcrumbPath="/terms">
      <h2 id="intro">Introduction</h2>
      <p>
        These Terms of Service govern access to and use of PulseVerse websites and applications.{" "}
        <strong>Have them reviewed and approved by your counsel</strong> before launch. Effective date:{" "}
        {legalDocumentsLastUpdatedDisplay}.
      </p>
      <p className="text-sm text-muted-foreground">{getLegalNotice()}</p>
      <p>
        A summary of moderation and reporting for clinicians and partners is on our{" "}
        <Link href="/trust" className={marketingInlineLink}>
          Trust &amp; safety
        </Link>{" "}
        page; these Terms and the Community guidelines remain the binding documents. Vendor processing of personal data
        is summarized in our{" "}
        <Link href="/privacy#subprocessors" className={marketingInlineLink}>
          Privacy Policy — Subprocessors
        </Link>
        .
      </p>
      <h2 id="eligibility">Eligibility</h2>
      <p>
        You must meet minimum age requirements and any professional suitability rules we publish for your region. You
        represent that your registration information is accurate.
      </p>
      <h2 id="license">License to operate</h2>
      <p>
        Subject to these terms, we grant you a limited, non-exclusive, non-transferable license to use the service. You
        grant PulseVerse the licenses reasonably necessary to host, display, and distribute content you submit —
        consistent with your privacy selections and product settings.
      </p>
      <h2 id="acceptable">Acceptable use</h2>
      <ul>
        <li>No harassment, illegal content, deceptive impersonation, or individualized medical advice framed as personal care.</li>
        <li>No attempts to circumvent safety tooling, abuse APIs, or scrape the service at scale without permission.</li>
        <li>No posting of identifiable patient information or other protected health information.</li>
      </ul>
      <h2 id="disclaimers">Disclaimers</h2>
      <p>
        The service is provided “as is.” To the maximum extent permitted by law, we disclaim implied warranties and
        limit liability as set forth in a counsel-approved agreement. Nothing here limits liability that cannot be
        limited under applicable law.
      </p>
      <h2 id="termination">Termination</h2>
      <p>
        We may suspend or terminate access for conduct that risks community safety or violates these terms. Where the
        product provides appeals or review flows, those processes apply as described in our community guidelines.
      </p>
    </LegalDoc>
  );
}
