import { LegalDoc } from "@/components/marketing/legal-doc";

const toc = [
  { id: "eligibility", label: "Eligibility" },
  { id: "license", label: "License to operate" },
  { id: "acceptable", label: "Acceptable use" },
  { id: "termination", label: "Termination" },
];

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Service" toc={toc}>
      <p>
        These terms govern use of PulseVerse properties and apps. Replace with counsel-approved language covering
        eligibility, licenses you grant, acceptable use, termination, disclaimers, and limitation of liability.
      </p>
      <h2 id="eligibility">Eligibility</h2>
      <p>You must meet minimum age and professional suitability requirements for your region.</p>
      <h2 id="license">License to operate</h2>
      <p>
        You grant PulseVerse the licenses necessary to host, display, and distribute content you submit — consistent with
        your privacy selections and these terms.
      </p>
      <h2 id="acceptable">Acceptable use</h2>
      <ul>
        <li>No harassment, illegal content, deceptive impersonation, or individualized medical advice framed as care.</li>
        <li>No attempts to circumvent safety tooling or scrape the service at scale without permission.</li>
      </ul>
      <h2 id="termination">Termination</h2>
      <p>We may suspend or terminate accounts that harm community safety or violate these terms — with appeal paths where noted in product policies.</p>
    </LegalDoc>
  );
}
