import type { Metadata } from "next";

import { LegalDoc } from "@/components/marketing/legal-doc";
import { canonical, m } from "@/lib/page-metadata";
import { getPrivacyEmail } from "@/lib/site-constants";

export const metadata: Metadata = { ...m.privacy, alternates: canonical("/privacy") };

const toc = [
  { id: "intro", label: "Introduction" },
  { id: "collect", label: "What we collect" },
  { id: "use", label: "How we use data" },
  { id: "share", label: "Sharing" },
  { id: "rights", label: "Your rights" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPage() {
  const privacyEmail = getPrivacyEmail();

  return (
    <LegalDoc title="Privacy Policy" toc={toc}>
      <h2 id="intro">Introduction</h2>
      <p>
        This Privacy Policy describes how PulseVerse (“we”, “us”) handles information when you use our websites and
        applications. It is intended for a professional audience in healthcare.{" "}
        <strong>Have this document reviewed by qualified legal counsel</strong> before treating it as final for your
        launch. Effective date: April 27, 2026.
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
        by law, or to protect users and the public. A subprocessors list can be published before launch if you use
        external services that touch personal data.
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
        <a href={`mailto:${privacyEmail}`} className="text-primary underline">
          {privacyEmail}
        </a>
      </p>
    </LegalDoc>
  );
}
