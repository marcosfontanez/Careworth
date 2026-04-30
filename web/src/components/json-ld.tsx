/**
 * Inline JSON-LD for search engines. Safe to place in server components.
 * @see https://nextjs.org/docs/app/guides/json-ld
 */
export function AppJsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD must not include HTML — stringify is sufficient.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
