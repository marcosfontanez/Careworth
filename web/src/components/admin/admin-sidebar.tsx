import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Flag,
  Frame,
  LayoutDashboard,
  Layers,
  Megaphone,
  Orbit,
  Radio,
  Scale,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { signOutAdmin } from "@/app/(admin)/admin/actions";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { Badge } from "@/components/ui/badge";
import type { AdminHealthStrip } from "@/types/admin-health";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; badge?: number };

const groups: { title: string; items: Item[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/insights", label: "Insights", icon: BarChart3 },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
      { href: "/admin/platform", label: "Platform", icon: Layers },
      { href: "/admin/avatar-borders", label: "Avatar borders", icon: Frame },
    ],
  },
  {
    title: "Community",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/circles", label: "Circles", icon: Orbit },
      { href: "/admin/live", label: "Live", icon: Radio },
    ],
  },
  {
    title: "Trust & safety",
    items: [
      { href: "/admin/moderation", label: "Moderation", icon: Shield },
      { href: "/admin/reports", label: "Reports", icon: Flag },
      { href: "/admin/appeals", label: "Appeals", icon: Scale },
    ],
  },
  {
    title: "Engagement",
    items: [
      { href: "/admin/advertisers", label: "Partner metrics", icon: TrendingUp },
      { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/admin/creators", label: "Creators", icon: Sparkles },
    ],
  },
  {
    title: "Settings",
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

export function AdminSidebar({
  currentPath,
  pendingAppealsCount = 0,
  health,
}: {
  currentPath: string;
  pendingAppealsCount?: number;
  health: AdminHealthStrip;
}) {
  return (
    <aside className="flex w-[16.5rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex min-h-[5rem] items-center justify-between gap-2 border-b border-sidebar-border px-3 py-2">
        <MarketingLogo variant="admin" className="min-w-0" />
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Admin</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Admin">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/90">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge: staticBadge }) => {
                const badge =
                  href === "/admin/appeals" && pendingAppealsCount > 0 ? pendingAppealsCount : staticBadge;
                const active =
                  currentPath === href || (href !== "/admin/dashboard" && currentPath.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-[rgba(45,127,249,0.18)] text-foreground ring-1 ring-primary/25"
                        : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90" />
                    <span className="flex-1 truncate">{label}</span>
                    {badge != null ? (
                      <Badge className="h-5 min-w-[1.25rem] justify-center border-amber-500/30 bg-amber-500/20 px-1 text-[10px] font-semibold text-amber-200">
                        {badge}
                      </Badge>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/admin/dashboard"
          className={cn(
            "mb-2 block rounded-lg border px-3 py-2 text-xs transition-colors hover:bg-sidebar-accent/50",
            health.worst === "down" && "border-rose-500/35 bg-rose-500/10 text-rose-100",
            health.worst === "degraded" && "border-amber-500/35 bg-amber-500/10 text-amber-100",
            health.worst === "operational" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-100/95",
          )}
        >
          <p className="font-semibold text-foreground">Platform checks</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {health.operationalCount}/{health.total} services OK
          </p>
          {health.worst !== "operational" ? (
            <p className="mt-1 text-[10px] opacity-90">Open dashboard → system health</p>
          ) : null}
        </Link>
        <form action={signOutAdmin}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
