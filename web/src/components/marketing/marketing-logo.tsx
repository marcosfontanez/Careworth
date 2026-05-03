import Image from "next/image";
import Link from "next/link";
import { site, pulseverseLogoLockup } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type Variant = "nav" | "footer" | "admin";

const heights: Record<Variant, string> = {
  nav: "h-[4.25rem] w-auto sm:h-[4.75rem] md:h-[5.25rem]",
  footer: "h-[4.5rem] w-auto sm:h-24",
  admin: "h-12 w-auto sm:h-14",
};

export function MarketingLogo({ className, variant = "nav" }: { className?: string; variant?: Variant }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex shrink-0 items-center", className)}
      aria-label={`${site.name} home`}
    >
      <Image
        src={pulseverseLogoLockup.src}
        alt=""
        width={pulseverseLogoLockup.width}
        height={pulseverseLogoLockup.height}
        sizes="(max-width: 640px) 88vw, (max-width: 768px) 360px, 400px"
        priority={variant === "nav"}
        className={cn(
          "w-auto max-w-[min(88vw,320px)] object-contain object-left sm:max-w-[360px] md:max-w-[400px]",
          variant === "footer" && "max-w-[min(92vw,380px)] sm:max-w-[420px]",
          variant === "admin" && "max-w-[240px] sm:max-w-[280px]",
          heights[variant],
        )}
      />
    </Link>
  );
}
