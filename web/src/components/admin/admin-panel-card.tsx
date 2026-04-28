import * as React from "react";
import { Card } from "@/components/ui/card";
import { adminPanelSurface } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export function AdminPanelCard({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return <Card className={cn(adminPanelSurface, className)} {...props} />;
}
