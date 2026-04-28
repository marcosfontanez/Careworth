import { LegalDoc } from "@/components/marketing/legal-doc";

const toc = [
  { id: "collect", label: "What we collect" },
  { id: "use", label: "How we use data" },
  { id: "rights", label: "Your rights" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" toc={toc}>
      <p>
        CareWorth respects the sensitivity of healthcare identity. This placeholder outlines sections your counsel will
        finalize: data categories collected, processing purposes, retention, subprocessors, regional rights, and contact.
      </p>
      <h2 id="collect">What we collect</h2>
      <p>
        Account data, content you post, engagement signals, device metadata, and trust & safety records as needed to
        operate the platform.
      </p>
      <h2 id="use">How we use data</h2>
      <p>
        Providing the service, personalization, safety, analytics, and legal compliance. No sale of personal data in this
        placeholder framework.
      </p>
      <h2 id="rights">Your rights</h2>
      <p>
        Depending on region, you may request access, correction, export, or deletion — subject to legal exceptions and
        safety retention policies.
      </p>
      <h2 id="contact">Contact</h2>
      <p>privacy@CareWorth.app (placeholder)</p>
    </LegalDoc>
  );
}
