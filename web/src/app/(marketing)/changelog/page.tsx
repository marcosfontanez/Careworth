import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingChangelogEntries } from "@/content/marketing-changelog";
import { marketingCardMuted } from "@/lib/ui-classes";
import { generateMarketingMetadata } from "@/lib/marketing-seo";
import { legalDocumentsLastUpdatedDisplay } from "@/lib/site-constants";
import { cn } from "@/lib/utils";

export const generateMetadata = () => generateMarketingMetadata("changelog");

export default function ChangelogPage() {
  return (
    <MarketingPageShell width="medium" breadcrumbPath="/changelog">
      <SectionHeader
        eyebrow="Changelog"
        title="What’s new on the public site"
        description={`Product updates ship in the apps first; this page highlights marketing-site and messaging milestones. For legal effective dates, see each document’s header (last updated ${legalDocumentsLastUpdatedDisplay}).`}
      />
      <ol className="mt-12 space-y-6">
        {marketingChangelogEntries.map((entry) => (
          <li key={entry.date + entry.title}>
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
