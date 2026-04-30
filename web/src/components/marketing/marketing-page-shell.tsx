import type { ReactNode } from "react";

import { MarketingBreadcrumbs } from "@/components/marketing/marketing-breadcrumbs";
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
  breadcrumbPath,
}: {
  children: ReactNode;
  width?: keyof typeof widths;
  className?: string;
  /** Sets visual breadcrumbs + BreadcrumbList JSON-LD (omit on home). */
  breadcrumbPath?: string;
}) {
  return (
    <>
      {breadcrumbPath ? <MarketingBreadcrumbs path={breadcrumbPath} /> : null}
      <div className={cn(widths[width], className)}>{children}</div>
    </>
  );
}
