import Link from "next/link";
import { Activity } from "lucide-react";
import { site } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export function MarketingLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-3", className)}>
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#0066ff] text-white shadow-[0_0_24px_-4px_rgba(45,127,249,0.7)]">
        <Activity className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </span>
      <span className="text-lg font-bold tracking-tight text-foreground">{site.name}</span>
    </Link>
  );
}
