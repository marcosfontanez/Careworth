"use client";

import { type ElementType, type ReactNode, useEffect, useRef } from "react";

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
 * globals.css. Pure CSS handles the glow + reveal.
 *
 * INP-safe: pointer tracking is (a) only wired up on fine-pointer devices —
 * touch/coarse devices keep the cheap static centered glow — and (b) coalesced
 * to one `requestAnimationFrame` per frame, so a burst of `pointermove` events
 * triggers at most a single style write + layout read per frame instead of one
 * per event. Listener is `passive`.
 */
export function SpotlightCard({
  children,
  as: Tag = "div",
  className,
  conicBorder = false,
}: SpotlightCardProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    if (!window.matchMedia?.("(pointer: fine)").matches) return;

    let frame = 0;
    let lastX = 0;
    let lastY = 0;

    const apply = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--pv-mx", `${lastX - rect.left}px`);
      el.style.setProperty("--pv-my", `${lastY - rect.top}px`);
    };

    const onMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Tag ref={ref} className={cn("pv-spotlight", conicBorder && "pv-conic-border", className)}>
      {children}
    </Tag>
  );
}
