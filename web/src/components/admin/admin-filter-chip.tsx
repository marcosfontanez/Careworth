"use client";

import { cn } from "@/lib/utils";

export function AdminFilterChip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-primary/50 bg-primary/15 text-foreground shadow-[0_0_20px_-8px_var(--color-primary)]"
          : "border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
