import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  active: "bg-primary/15 text-primary border-primary/30",
  suspended: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  banned: "bg-destructive/15 text-red-200 border-destructive/30",
  pending: "bg-pv-electric/15 text-blue-200 border-pv-electric/30",
  under_review: "bg-pv-gold/15 text-amber-100 border-pv-gold/30",
  resolved: "bg-muted text-muted-foreground",
  open: "bg-primary/15 text-primary",
  accepted: "bg-primary/20 text-primary",
  denied: "bg-destructive/15 text-red-200",
  live: "bg-primary/20 text-primary animate-pulse",
  ended: "bg-muted text-muted-foreground",
  flagged: "bg-destructive/20 text-red-200",
  critical: "bg-destructive/25 text-red-100",
  high: "bg-amber-500/20 text-amber-100",
  medium: "bg-pv-electric/20 text-blue-100",
  low: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = variants[status] ?? "bg-secondary text-secondary-foreground";
  return (
    <Badge variant="outline" className={cn("border font-normal capitalize", cls)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
