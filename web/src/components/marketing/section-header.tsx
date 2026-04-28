import { marketingEyebrow } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      {eyebrow && <p className={cn(marketingEyebrow, "tracking-widest")}>{eyebrow}</p>}
      <h2
        className={cn(
          "text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl",
          eyebrow ? "mt-3" : "mt-0",
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg text-pretty leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
