import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { getChangelogPageCopy } from "@/lib/marketing-copy/changelog-page";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { marketingCardMuted } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export const generateMetadata = () => generateMarketingMetadata("changelog");

export default async function ChangelogPage() {
  const locale = await getMarketingLocale();
  const c = getChangelogPageCopy(locale);

  return (
    <MarketingPageShell width="medium" breadcrumbPath="/changelog">
      <SectionHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />
      <ol className="mt-12 space-y-6">
        {c.entries.map((entry) => (
          <li key={`${entry.date}-${entry.title}`}>
            <div className={cn("rounded-2xl p-6", marketingCardMuted)}>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{entry.date}</p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">{entry.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </MarketingPageShell>
  );
}
