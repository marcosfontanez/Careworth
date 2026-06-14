"use client";

import { type ElementType, type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  /** Render element — default div. */
  as?: ElementType;
  /** Stagger delay in ms applied to the entrance transition. */
  delay?: number;
  className?: string;
};

/**
 * Scroll-entrance wrapper. On mount (and only when motion is allowed), it hides
 * the element and fades/rises it in when it scrolls into view.
 *
 * Important: the hidden state is applied *after* mount via the `data-reveal`
 * attribute, so server-rendered HTML is fully visible for no-JS users and for
 * anyone with `prefers-reduced-motion`. Wrap below-the-fold content only — the
 * hero is visible at load and should not be wrapped (would flash).
 */
export function Reveal({ children, as: Tag = "div", delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return;
    }

    setEnabled(true);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal={enabled ? "" : undefined}
      data-shown={shown ? "" : undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}

/**
 * Convenience wrapper that staggers a list of children with an incremental
 * delay. Each child is wrapped in its own Reveal.
 */
export function RevealGroup({
  children,
  step = 90,
  className,
  itemClassName,
}: {
  children: ReactNode[];
  step?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn(className)}>
      {children.map((child, i) => (
        <Reveal key={i} delay={i * step} className={itemClassName}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
