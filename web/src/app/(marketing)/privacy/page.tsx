import Link from "next/link";

import { LegalDoc } from "@/components/marketing/legal-doc";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { getPrivacyEmail, getSecurityEmail, legalDocumentsLastUpdatedDisplay } from "@/lib/site-constants";
import { marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export const generateMetadata = () => generateMarketingMetadata("privacy");

const toc = [
  { id: "intro", label: "Introduction" },
  { id: "collect", label: "What we collect" },
  { id: "use", label: "How we use data" },
  { id: "share", label: "Sharing" },
  { id: "subprocessors", label: "Subprocessors" },
  { id: "retention", label: "Retention" },
  { id: "rights", label: "Your rights" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPage() {
  const privacyEmail = getPrivacyEmail();
  const securityEmail = getSecurityEmail();

  return (
    <LegalDoc title="Privacy Policy" toc={toc} breadcrumbPath="/privacy">
      <h2 id="intro">Introduction</h2>
      <p>
        This Privacy Policy describes how PulseVerse (“we”, “us”) handles information when you use our websites and
        applications. It is intended for a professional audience in healthcare.{" "}
        <strong>Have this document reviewed by qualified legal counsel</strong> before treating it as final for your
        launch. Effective date: {legalDocumentsLastUpdatedDisplay}.
      </p>
      <p>
        For a plain-language overview of moderation, reporting, and safety expectations, see our{" "}
        <Link href="/trust" className={marketingInlineLink}>
          Trust &amp; safety
        </Link>{" "}
        page (in addition to this Policy and the Community guidelines).
      </p>
      <h2 id="collect">What we collect</h2>
      <p>
        We may collect account and profile information, content you submit, usage and engagement data, device and log
        information, and trust &amp; safety records needed to operate and protect the service.
      </p>
      <h2 id="use">How we use data</h2>
      <p>
        We use information to provide and improve the platform, personalize the experience where you opt in, maintain
        safety and integrity, communicate with you about the service, comply with law, and exercise or defend legal
        claims. We do not sell your personal information.
      </p>
      <h2 id="share">Sharing</h2>
      <p>
        We may share information with infrastructure and analytics vendors who process it under contract, when required
        by law, or to protect users and the public. See{" "}
        <a href="#subprocessors" className={marketingInlineLink}>
          Subprocessors
        </a>{" "}
        for vendors that typically handle personal data in our stack. Update this list when you onboard vendors or
        change regions with counsel review.
      </p>
      <h2 id="subprocessors">Subprocessors</h2>
      <p>
        The table below describes primary infrastructure and observability providers used to operate the web app and
        APIs. Actual legal roles (processor v. subprocessor) and data locations depend on your contracts and Supabase
        project region — validate before publish.
      </p>
      <div className={cn("mt-4 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]")}>
        <table>
          <thead>
            <tr>
              <th scope="col">Vendor</th>
              <th scope="col">Typical processing role</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vercel</td>
              <td>Hosting, serverless compute, edge routing, Web Analytics / Speed Insights</td>
              <td>US / EU regions per project; see Vercel DPA.</td>
            </tr>
            <tr>
              <td>Supabase</td>
              <td>Auth, Postgres database, object storage, realtime</td>
              <td>Data region follows your Supabase project; primary system of record for accounts.</td>
            </tr>
            <tr>
              <td>Sentry</td>
              <td>Error and performance monitoring</td>
              <td>Optional; may receive stack traces and request metadata when enabled.</td>
            </tr>
            <tr>
              <td>Upstash</td>
              <td>Optional Redis for rate limiting / throttling</td>
              <td>Only if you configure Upstash keys; used for abuse protection, not primary storage.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2 id="retention">Retention</h2>
      <p>
        We retain information for as long as needed to operate the service, comply with law or regulation, resolve
        disputes, enforce safety policies, and maintain the integrity of trust &amp; safety records. For moderation,
        audit, or legal processes, certain records may be held beyond a normal deletion cycle where required — have
        counsel align this language with your retention schedule.
      </p>
      <h2 id="rights">Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, delete, or export certain information, or to
        object to or restrict some processing. We may retain information where required for safety or legal reasons.
        Submit requests using the contact below.
      </p>
      <h2 id="contact">Contact</h2>
      <p>
        Privacy inquiries:{" "}
        <a href={`mailto:${privacyEmail}`} className={marketingInlineLink}>
          {privacyEmail}
        </a>
      </p>
      <p>
        Security reports and responsible disclosure:{" "}
        <a href={`mailto:${securityEmail}`} className={marketingInlineLink}>
          {securityEmail}
        </a>{" "}
        — see also{" "}
        <Link href="/.well-known/security.txt" className={marketingInlineLink}>
          security.txt
        </Link>
        .
      </p>
    </LegalDoc>
  );
}
