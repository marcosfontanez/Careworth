"use client";

import { type ElementType, type ReactNode, useRef } from "react";

import { cn } from "@/lib/utils";

type SpotlightCardProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Adds the rotating conic gradient border (use for flagship tiles only). */
  conicBorder?: boolean;
};

/**
 * Card surface with a cursor-follow radial spotlight. Tracks the pointer and
 * writes `--pv-mx` / `--pv-my` CSS vars consumed by the `.pv-spotlight` rule in
 * globals.css. Pure CSS handles the glow + reveal; under reduced motion the
 * glow simply doesn't animate. Pointer tracking is skipped on touch devices.
 */
export function SpotlightCard({
  children,
  as: Tag = "div",
  className,
  conicBorder = false,
}: SpotlightCardProps) {
  const ref = useRef<HTMLElement | null>(null);

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--pv-mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--pv-my", `${e.clientY - rect.top}px`);
  };

  return (
    <Tag
      ref={ref}
      onMouseMove={handleMove}
      className={cn("pv-spotlight", conicBorder && "pv-conic-border", className)}
    >
      {children}
    </Tag>
  );
}
