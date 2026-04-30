import Link from "next/link";

import { LegalDoc } from "@/components/marketing/legal-doc";
import { getCommunityGuidelinesPageCopy } from "@/lib/marketing-copy/community-guidelines-page";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { legalDocumentsLastUpdatedDisplay } from "@/lib/site-constants";

export const generateMetadata = () => generateMarketingMetadata("communityGuidelines");

export default async function CommunityGuidelinesPage() {
  const locale = await getMarketingLocale();
  const c = getCommunityGuidelinesPageCopy(locale);

  return (
    <LegalDoc title={c.docTitle} toc={c.toc} updated={legalDocumentsLastUpdatedDisplay} breadcrumbPath="/community-guidelines">
      <p>{c.intro}</p>
      <h2 id={c.toc[0]!.id}>{c.expectationsHeading}</h2>
      <ul>
        {c.expectationsItems.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      <h2 id={c.toc[1]!.id}>{c.safetyHeading}</h2>
      <p>
        {c.safetyLead}{" "}
        <Link href="/trust" className="font-medium text-primary underline hover:no-underline">
          {c.safetyTrustLink}
        </Link>
        .
      </p>
      <h2 id={c.toc[2]!.id}>{c.enforcementHeading}</h2>
      <p>
        {c.enforcementLead}{" "}
        <Link href="/trust" className="font-medium text-primary underline hover:no-underline">
          {c.enforcementTrustLink}
        </Link>
        .
      </p>
    </LegalDoc>
  );
}
