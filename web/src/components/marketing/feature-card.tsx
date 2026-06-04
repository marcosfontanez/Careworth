import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { marketingCardInteractive, marketingFocusRing } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "group rounded-2xl backdrop-blur-md",
        marketingCardInteractive,
        marketingFocusRing,
        className,
      )}
    >
      <CardHeader className="gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition group-hover:border-primary/40 group-hover:bg-primary/15">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <CardTitle className="font-heading text-lg tracking-tight sm:text-xl">{title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed sm:text-base">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
