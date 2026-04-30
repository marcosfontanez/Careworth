import Link from "next/link";

import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SectionHeader } from "@/components/marketing/section-header";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { getTrustPageCopy } from "@/lib/marketing-copy/trust-page";
import { getSecurityEmail } from "@/lib/site-constants";
import { marketingCardMuted, marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export const generateMetadata = () => generateMarketingMetadata("trust");

export default async function TrustPage() {
  const locale = await getMarketingLocale();
  const c = getTrustPageCopy(locale);
  const securityEmail = getSecurityEmail();

  return (
    <MarketingPageShell width="medium" breadcrumbPath="/trust">
      <SectionHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {c.sections.map((s) => (
          <div key={s.title} className={cn("rounded-2xl p-6", marketingCardMuted)}>
            <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-8 ring-1 ring-white/[0.04]">
        <p className="text-sm font-semibold text-foreground">{c.disclosureTitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {c.disclosureBeforeEmail}{" "}
          <a href={`mailto:${securityEmail}`} className={marketingInlineLink}>
            {securityEmail}
          </a>
          {c.disclosureAfterEmail}{" "}
          <Link href="/.well-known/security.txt" className={marketingInlineLink}>
            {c.securityTxtLabel}
          </Link>
          .
        </p>
      </div>
      <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-8 ring-1 ring-white/[0.04]">
        <p className="text-sm font-semibold text-foreground">{c.relatedTitle}</p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {c.relatedLinks.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={marketingInlineLink}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingPageShell>
  );
}
