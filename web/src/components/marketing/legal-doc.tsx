import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
import { legalDocumentsLastUpdatedDisplay } from "@/lib/site-constants";
import { marketingShell } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export function LegalDoc({
  title,
  updated = legalDocumentsLastUpdatedDisplay,
  toc,
  children,
  breadcrumbPath,
}: {
  title: string;
  updated?: string;
  toc?: readonly { id: string; label: string }[];
  children: React.ReactNode;
  breadcrumbPath?: string;
}) {
  const hasToc = Boolean(toc && toc.length > 0);
  return (
    <>
      {breadcrumbPath ? <MarketingBreadcrumbs path={breadcrumbPath} /> : null}
      <div
      className={cn(
        marketingShell,
        hasToc && "lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12",
      )}
    >
      {hasToc && toc && (
        <aside className="mb-10 lg:mb-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
          <nav className="mt-4 space-y-2 text-sm" aria-label="Table of contents">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block rounded-md px-2 py-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>
      )}
      <article
        className={cn(
          hasToc ? "min-w-0" : "mx-auto max-w-3xl",
          "rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.45)] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.04] backdrop-blur-sm sm:p-10",
        )}
      >
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {updated}. Review with qualified legal counsel before relying on this text as your sole policy
          document.
        </p>
        <div className="mt-10 space-y-4 leading-relaxed text-muted-foreground [&_h2]:scroll-mt-28 [&_h2]:border-b [&_h2]:border-border/60 [&_h2]:pb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border-b [&_th]:border-white/15 [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_td]:border-b [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2.5 [&_tbody_tr:last-child_td]:border-b-0 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </div>
    </>
  );
}
