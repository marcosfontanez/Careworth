import Link from "next/link";

import { LegalDoc } from "@/components/marketing/legal-doc";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { legalDocumentsLastUpdatedDisplay } from "@/lib/site-constants";

export const generateMetadata = () => generateMarketingMetadata("communityGuidelines");

const toc = [
  { id: "expectations", label: "Core expectations" },
  { id: "safety", label: "Safety & PHI" },
  { id: "enforcement", label: "Enforcement" },
];

export default function CommunityGuidelinesPage() {
  return (
    <LegalDoc title="Community Guidelines" toc={toc} updated={legalDocumentsLastUpdatedDisplay} breadcrumbPath="/community-guidelines">
      <p>
        PulseVerse is a culture network for healthcare professionals. Be respectful, accurate, and mindful of patient
        privacy. Moderation may restrict accounts that harm community safety.
      </p>
      <h2 id="expectations">Core expectations</h2>
      <ul>
        <li>Treat colleagues and students with dignity — especially across power differences.</li>
        <li>Label educational content; avoid implying individualized care in public posts.</li>
        <li>Disclose conflicts when discussing products, employers, or sponsors.</li>
      </ul>
      <h2 id="safety">Safety & PHI</h2>
      <p>
        Protect PHI — no wristbands, faces, or charts without consent and policy alignment. Report content that risks
        patient privacy or promotes unsafe practices. For a network-level overview of reporting and moderation, see{" "}
        <Link href="/trust" className="font-medium text-primary underline hover:no-underline">
          Trust &amp; safety
        </Link>
        .
      </p>
      <h2 id="enforcement">Enforcement</h2>
      <p>
        Moderators may remove content, restrict features, or suspend accounts. Appeals are available for many enforcement
        actions — see in-app flows. High-level context:{" "}
        <Link href="/trust" className="font-medium text-primary underline hover:no-underline">
          Trust &amp; safety
        </Link>
        .
      </p>
    </LegalDoc>
  );
}
