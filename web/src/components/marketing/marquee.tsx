import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Seamless auto-scrolling marquee. Renders the children track twice so the
 * loop is continuous, pauses on hover, and fades at both edges. Motion stops
 * under prefers-reduced-motion (handled globally). Decorative by default —
 * the duplicate track is hidden from assistive tech.
 */
export function Marquee({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pv-marquee-group group relative w-full overflow-hidden",
        "[mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]",
        className,
      )}
    >
      <div className="pv-marquee flex w-max items-stretch gap-3">
        <div className="flex shrink-0 items-stretch gap-3">{children}</div>
        <div aria-hidden className="flex shrink-0 items-stretch gap-3">
          {children}
        </div>
      </div>
    </div>
  );
}
