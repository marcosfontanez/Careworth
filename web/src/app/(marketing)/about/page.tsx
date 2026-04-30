import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { getAboutPageCopy } from "@/lib/marketing-copy/about-page";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { marketingCardMuted } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export const generateMetadata = () => generateMarketingMetadata("about");

export default async function AboutPage() {
  const locale = await getMarketingLocale();
  const c = getAboutPageCopy(locale);

  return (
    <MarketingPageShell width="medium" breadcrumbPath="/about">
      <SectionHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {c.pillars.map((p) => (
          <div key={p.title} className={cn("rounded-2xl p-6", marketingCardMuted)}>
            <h2 className="text-lg font-semibold text-foreground">{p.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-8 ring-1 ring-white/[0.04]">
        <p className="text-lg leading-relaxed text-muted-foreground">{c.closing}</p>
      </div>
    </MarketingPageShell>
  );
}
