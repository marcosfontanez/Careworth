import type { ReactNode } from "react";
import {
  marketingShell,
  marketingShellForm,
  marketingShellNarrow,
  marketingShellTight,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const widths = {
  wide: marketingShell,
  medium: marketingShellNarrow,
  tight: marketingShellTight,
  form: marketingShellForm,
} as const;

export function MarketingPageShell({
  children,
  width = "wide",
  className,
}: {
  children: ReactNode;
  width?: keyof typeof widths;
  className?: string;
}) {
  return <div className={cn(widths[width], className)}>{children}</div>;
}
