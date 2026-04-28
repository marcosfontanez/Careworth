import { SectionHeader } from "@/components/marketing/section-header";
import { homeAudience } from "@/mock/marketing";

export function HomeAudience() {
  return (
    <section className="border-t border-border/80 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader title={homeAudience.title} description={homeAudience.description} />
        <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
          {homeAudience.roles.map((r) => (
            <li
              key={r}
              className="rounded-full border border-border/80 bg-secondary/30 px-4 py-2 text-sm text-foreground"
            >
              {r}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
