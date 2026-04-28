import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/brand/pulseverse-logo-lockup.png";

type Variant = "nav" | "footer" | "admin";

const heights: Record<Variant, string> = {
  nav: "h-9 sm:h-10",
  footer: "h-11 sm:h-12",
  admin: "h-8",
};

export function MarketingLogo({ className, variant = "nav" }: { className?: string; variant?: Variant }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex shrink-0 items-center", className)}
      aria-label={`${site.name} home`}
    >
      <Image
        src={LOGO_SRC}
        alt=""
        width={1024}
        height={1024}
        priority={variant === "nav"}
        className={cn("w-auto max-w-[148px] object-contain object-left sm:max-w-[168px]", heights[variant])}
        sizes="(max-width: 640px) 140px, 168px"
      />
    </Link>
  );
}
