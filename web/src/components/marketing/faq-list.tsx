import { cn } from "@/lib/utils";

type FaqItem = { q: string; a: string };

function findOpenIndex(items: readonly FaqItem[], highlightQuery?: string | null): number {
  const normalized = highlightQuery?.trim().toLowerCase();
  if (!normalized) return -1;
  const exact = items.findIndex((item) => item.q.toLowerCase() === normalized);
  if (exact >= 0) return exact;
  return items.findIndex(
    (item) => item.q.toLowerCase().includes(normalized) || item.a.toLowerCase().includes(normalized),
  );
}

/**
 * Server-rendered FAQ — answers stay in the DOM for SEO/crawlers (not client-hidden).
 * Uses native `<details>` for progressive disclosure without JS.
 */
export function FaqList({
  items,
  highlightQuery,
}: {
  items: readonly FaqItem[];
  highlightQuery?: string | null;
}) {
  const openIndex = findOpenIndex(items, highlightQuery);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <details
          key={item.q}
          open={openIndex === i ? true : undefined}
          className={cn(
            "group rounded-xl border border-white/10 bg-[rgba(12,21,36,0.45)] ring-1 ring-white/4",
            "open:border-accent/25 open:shadow-[0_0_40px_-20px_rgba(20,184,166,0.35)]",
          )}
        >
          <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-foreground outline-none marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-start gap-3">
              <span
                className="mt-0.5 inline-block h-4 w-4 shrink-0 rotate-0 text-accent transition group-open:rotate-90"
                aria-hidden
              >
                ›
              </span>
              <span>{item.q}</span>
            </span>
          </summary>
          <div className="border-t border-white/8 px-4 pb-4 pl-11 text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  );
}
