import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        "group border border-[rgba(148,163,184,0.12)] bg-[rgba(12,21,36,0.5)] backdrop-blur-sm transition hover:border-primary/40 hover:shadow-[0_0_40px_-12px_rgba(45,127,249,0.35)]",
        className,
      )}
    >
      <CardHeader>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition group-hover:bg-primary/25">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
