import type { Metadata } from "next";

import { LegalDoc } from "@/components/marketing/legal-doc";
import { canonical, m } from "@/lib/page-metadata";

export const metadata: Metadata = { ...m.communityGuidelines, alternates: canonical("/community-guidelines") };

const toc = [
  { id: "expectations", label: "Core expectations" },
  { id: "safety", label: "Safety & PHI" },
  { id: "enforcement", label: "Enforcement" },
];

export default function CommunityGuidelinesPage() {
  return (
    <LegalDoc title="Community Guidelines" toc={toc}>
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
        patient privacy or promotes unsafe practices.
      </p>
      <h2 id="enforcement">Enforcement</h2>
      <p>
        Moderators may remove content, restrict features, or suspend accounts. Appeals are available for many enforcement
        actions — see in-app flows.
      </p>
    </LegalDoc>
  );
}
