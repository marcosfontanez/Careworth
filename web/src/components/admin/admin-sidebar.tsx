import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Flag,
  LayoutDashboard,
  Megaphone,
  Orbit,
  Radio,
  Scale,
  Settings,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

import { signOutAdmin } from "@/app/(admin)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { site } from "@/lib/design-tokens";
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
      { href: "/admin/appeals", label: "Appeals", icon: Scale, badge: 8 },
    ],
  },
  {
    title: "Engagement",
    items: [
      { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/admin/creators", label: "Creators", icon: Sparkles },
    ],
  },
  {
    title: "Settings",
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

export function AdminSidebar({ currentPath }: { currentPath: string }) {
  return (
    <aside className="flex w-[16.5rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#0066ff] text-white shadow-lg shadow-primary/25">
          <Activity className="h-5 w-5" strokeWidth={2.2} aria-hidden />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">{site.name}</p>
          <p className="text-xs text-muted-foreground">Admin console</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Admin">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/90">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
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
        <div className="mb-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200/90">
          <p className="font-semibold text-emerald-100">All systems operational</p>
          <p className="mt-0.5 text-[10px] text-emerald-200/70">Web · API · Live</p>
        </div>
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
