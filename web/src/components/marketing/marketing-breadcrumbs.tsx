import Link from "next/link";

import { AppJsonLd } from "@/components/json-ld";
import { buildBreadcrumbs } from "@/lib/breadcrumbs";
import { breadcrumbListSchema } from "@/lib/structured-data";
import { marketingGutterX, marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/** Visual trail + BreadcrumbList JSON-LD. Omit on home (`path` `/`). */
export function MarketingBreadcrumbs({ path, className }: { path: string; className?: string }) {
  const items = buildBreadcrumbs(path);
  if (items.length <= 1) {
    return null;
  }

  return (
    <>
      <AppJsonLd data={breadcrumbListSchema(items)} />
      <div className={cn(marketingGutterX, "pt-4 pb-0 sm:pt-5", className)}>
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
            {items.map((item, i) => (
              <li key={item.href} className="flex items-center gap-2">
                {i > 0 ? (
                  <span aria-hidden className="text-muted-foreground/50">
                    /
                  </span>
                ) : null}
                {i < items.length - 1 ? (
                  <Link href={item.href} className={marketingInlineLink}>
                    {item.name}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground" aria-current="page">
                    {item.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </>
  );
}
