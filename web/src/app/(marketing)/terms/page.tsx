import Link from "next/link";

import { LegalDoc } from "@/components/marketing/legal-doc";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { getLegalEmail, getLegalNotice, legalDocumentsLastUpdatedDisplay } from "@/lib/site-constants";
import { marketingInlineLink } from "@/lib/ui-classes";

export const generateMetadata = () => generateMarketingMetadata("terms");

const toc = [
  { id: "intro", label: "Introduction" },
  { id: "eligibility", label: "Eligibility" },
  { id: "ugc-license", label: "Your content" },
  { id: "ownership", label: "Ownership" },
  { id: "moderation", label: "Moderation" },
  { id: "reporting", label: "Reporting & blocking" },
  { id: "live", label: "Live streaming" },
  { id: "prohibited", label: "Prohibited content" },
  { id: "phi", label: "PHI prohibition" },
  { id: "medical", label: "No medical advice" },
  { id: "creator", label: "Creator tools & beta" },
  { id: "purchases", label: "In-app purchases" },
  { id: "refunds", label: "Refunds" },
  { id: "ads", label: "Sponsored content" },
  { id: "copyright", label: "Copyright / DMCA" },
  { id: "termination", label: "Suspension & termination" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "law", label: "Governing law" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  const legalEmail = getLegalEmail();

  return (
    <LegalDoc title="Terms of Service" toc={toc} breadcrumbPath="/terms">
      <h2 id="intro">Introduction</h2>
      <p>
        These Terms of Service (“Terms”) govern access to and use of PulseVerse websites and applications — including
        Feed, Circles, My Pulse, Live, creator tools, and in-app purchases. Effective date:{" "}
        {legalDocumentsLastUpdatedDisplay}.
      </p>
      <p className="text-sm text-muted-foreground">{getLegalNotice()}</p>
      <p>
        For moderation and reporting overview, see{" "}
        <Link href="/trust" className={marketingInlineLink}>
          Trust &amp; safety
        </Link>
        . Enforceable community rules are in our{" "}
        <Link href="/community-guidelines" className={marketingInlineLink}>
          Community guidelines
        </Link>
        . Data practices are in our{" "}
        <Link href="/privacy" className={marketingInlineLink}>
          Privacy Policy
        </Link>
        .
      </p>

      <h2 id="eligibility">Eligibility</h2>
      <p>
        You must meet minimum age requirements for your region and provide accurate registration information. PulseVerse
        is healthcare-rooted and open to healthcare workers, students, caregivers, creators, and curious minds who agree
        to these Terms and our Community guidelines.
      </p>

      <h2 id="ugc-license">User-generated content license</h2>
      <p>
        You retain ownership of content you create, subject to the licenses below. By posting or streaming on
        PulseVerse, you grant us a worldwide, non-exclusive, royalty-free license to host, store, reproduce, distribute,
        display, perform, and otherwise use your content to operate, promote, and improve the service — including
        formatting, transcoding, and creating thumbnails — consistent with your privacy settings and product features.
      </p>
      <p>
        You represent that you have the rights to post your content and that it does not violate these Terms, applicable
        law, or third-party rights.
      </p>

      <h2 id="ownership">Content ownership</h2>
      <p>
        PulseVerse owns the platform, brand, software, and design. Your content remains yours. Shop items, borders,
        Sparks, and other digital goods are licensed for use within the product according to shop rules — not sold as
        physical goods unless explicitly stated.
      </p>

      <h2 id="moderation">Moderation &amp; enforcement</h2>
      <p>
        We may review content and accounts using automated tools and human moderators. We may remove content, restrict
        features, limit distribution, suspend Live access, or terminate accounts that violate these Terms, our
        Community guidelines, or applicable law. Enforcement may consider severity, history, and safety risk.
      </p>

      <h2 id="reporting">Reporting, blocking, muting &amp; appeals</h2>
      <p>
        You can report posts, comments, profiles, Circles, and Live content through in-app tools. You may block or mute
        other accounts where the product supports it. Where appeals are available, follow in-app flows or contact support.
        See{" "}
        <Link href="/trust" className={marketingInlineLink}>
          Trust &amp; safety
        </Link>{" "}
        for what to expect after a report.
      </p>

      <h2 id="live">Live streaming rules</h2>
      <p>
        Live streams must follow the same safety standards as other content. Do not stream illegal activity, harassment,
        PHI, sexual content involving minors, dangerous instructions, or other prohibited material. Live chat, polls,
        gifts, and reactions are subject to moderation. We may end streams or restrict Live access without notice when
        safety requires it.
      </p>

      <h2 id="prohibited">Prohibited content &amp; conduct</h2>
      <ul>
        <li>Harassment, hate, threats, or targeted abuse</li>
        <li>Illegal content or facilitation of illegal activity</li>
        <li>Child sexual abuse material (CSAM) or exploitation — zero tolerance</li>
        <li>Deceptive impersonation, spam, or manipulation of engagement</li>
        <li>Attempts to circumvent safety systems or scrape at scale without permission</li>
        <li>Unsafe or misleading healthcare content that could cause harm</li>
      </ul>

      <h2 id="phi">PHI prohibition</h2>
      <p>
        PulseVerse is not a system of record for identifiable patient information. You may not post protected health
        information (PHI) or individually identifiable patient details on public surfaces — including names, faces,
        identifiers, dates, room numbers, or combinations that could identify a person.
      </p>

      <h2 id="medical">No individualized medical advice; no provider–patient relationship</h2>
      <p>
        PulseVerse does not provide medical advice, diagnosis, or treatment. Content on the platform is not a substitute
        for professional clinical judgment. Using PulseVerse does not create a provider–patient relationship between you
        and PulseVerse or between members. Educational storytelling is welcome; individualized care decisions belong in
        proper clinical channels.
      </p>

      <h2 id="creator">Creator tools &amp; beta features</h2>
      <p>
        Creator tools — recording, upload, B-roll Studio, drafts, scheduling, and related features — may change, move
        between mobile and web, or launch as beta. Beta features are provided “as is” and may be limited, withdrawn, or
        modified without notice.
      </p>

      <h2 id="purchases">In-app purchases: Sparks, gifts, borders &amp; digital goods</h2>
      <p>
        Sparks, gifts, avatar borders, pulse frames, and other digital items are sold through the Pulse Shop. Purchases on
        mobile are processed by Apple App Store or Google Play. Prices, availability, and catalog items may change.
        Digital goods are licensed for use in PulseVerse — not transferable outside the platform unless we explicitly
        allow it.
      </p>

      <h2 id="refunds">Refunds &amp; platform payment handling</h2>
      <p>
        Refund requests for mobile purchases are generally handled through Apple or Google according to their policies.
        Contact platform support with your receipt if you believe a purchase was made in error. We may revoke fulfilled
        digital goods associated with reversed or fraudulent transactions.
      </p>

      <h2 id="ads">Sponsored &amp; advertiser content</h2>
      <p>
        Branded, sponsored, or paid partnership content must be labeled clearly where required by law and our advertising
        policies. Advertisers and partners must comply with applicable disclosure and brand-safety requirements.
      </p>

      <h2 id="copyright">Copyright &amp; DMCA</h2>
      <p>
        If you believe content on PulseVerse infringes your copyright, send a notice to{" "}
        <a href={`mailto:${legalEmail}`} className={marketingInlineLink}>
          {legalEmail}
        </a>{" "}
        with information required under applicable copyright law (including identification of the work, the material at
        issue, and your contact details). We may remove or disable access to allegedly infringing material and terminate
        repeat infringers where appropriate.
      </p>

      <h2 id="termination">Account suspension &amp; termination</h2>
      <p>
        We may suspend or terminate your access immediately for serious violations, safety risks, or repeated enforcement
        actions. You may stop using PulseVerse at any time and delete your account through in-app Settings. Provisions
        that by nature should survive termination (licenses granted for operational needs, disclaimers, limitations) will
        survive.
      </p>

      <h2 id="disclaimers">Disclaimers &amp; limitation of liability</h2>
      <p>
        The service is provided “as is” and “as available.” To the maximum extent permitted by law, PulseVerse disclaims
        implied warranties and limits liability for indirect, incidental, special, consequential, or punitive damages.
        Nothing here limits liability that cannot be limited under applicable law.
      </p>

      <h2 id="law">Governing law &amp; disputes</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law
        principles, except where mandatory consumer protections in your country of residence apply. Unless prohibited by
        applicable law, disputes arising from these Terms or your use of PulseVerse will be resolved in the state or
        federal courts located in Delaware, and you consent to personal jurisdiction in those courts.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a href={`mailto:${legalEmail}`} className={marketingInlineLink}>
          {legalEmail}
        </a>
        .
      </p>
    </LegalDoc>
  );
}
