import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardList,
  Flag,
  ImageDown,
  LayoutDashboard,
  Layers,
  LineChart,
  Megaphone,
  MessagesSquare,
  Music2,
  Orbit,
  Package,
  Radio,
  Scale,
  ScrollText,
  Settings,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { signOutAdmin } from "@/app/(admin)/admin/actions";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { Badge } from "@/components/ui/badge";
import { ADMIN_SIDEBAR_HREF_PERMISSION } from "@/lib/staffPermissions-shared";
import type { StaffPermission, StaffRole } from "@/lib/staffPermissions-shared";
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
      { href: "/admin/sound-catalog", label: "Sound catalog", icon: Music2 },
      { href: "/admin/merchandising", label: "Shop & borders", icon: ShoppingBag },
      { href: "/admin/economy", label: "Sparks economy", icon: Wallet },
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
      { href: "/admin/brand-safety", label: "Brand safety", icon: ShieldAlert },
    ],
  },
  {
    title: "Partnerships & revenue",
    items: [
      { href: "/admin/advertisers", label: "Advertiser overview", icon: TrendingUp },
      { href: "/admin/audience-insights", label: "Audience insights", icon: LineChart },
      { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/admin/reports/sponsored", label: "Sponsored delivery", icon: LineChart },
      { href: "/admin/inventory", label: "Inventory & placements", icon: Package },
      { href: "/admin/creators", label: "Creators", icon: Sparkles },
      { href: "/admin/leads", label: "Leads / inquiries", icon: MessagesSquare },
      { href: "/admin/media-kit", label: "Media kit / exports", icon: ImageDown },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/admin/settings#preferences", label: "Preferences", icon: ClipboardList },
      { href: "/admin/settings#platform-controls", label: "Platform controls", icon: Settings },
    ],
  },
];

export function AdminSidebar({
  currentPath,
  pendingAppealsCount = 0,
  health,
  allowedPermissions,
  staffRoles,
}: {
  currentPath: string;
  pendingAppealsCount?: number;
  health: AdminHealthStrip;
  allowedPermissions: StaffPermission[];
  staffRoles: StaffRole[];
}) {
  const allowed = new Set(allowedPermissions);

  function canSeeHref(href: string): boolean {
    const base = href.split("#")[0] ?? href;
    const perm = ADMIN_SIDEBAR_HREF_PERMISSION[base];
    if (!perm) return true;
    return allowed.has(perm);
  }

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeHref(item.href)),
    }))
    .filter((group) => group.items.length > 0);
  function linkActive(href: string): boolean {
    const base = href.split("#")[0] ?? href;
    if (base === "/admin/dashboard") return currentPath === base;
    return currentPath === base || currentPath.startsWith(`${base}/`);
  }

  return (
    <aside className="flex w-66 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground print:hidden">
      <div className="flex min-h-20 items-center justify-between gap-2 border-b border-sidebar-border px-3 py-2">
        <MarketingLogo variant="admin" className="min-w-0" />
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Admin</span>
      </div>
      {staffRoles.length ? (
        <p className="border-b border-sidebar-border px-3 py-2 text-[10px] text-muted-foreground">
          Roles: {staffRoles.join(", ")}
        </p>
      ) : null}
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Admin">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/90">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge: staticBadge }) => {
                const badge =
                  href.startsWith("/admin/appeals") && pendingAppealsCount > 0 ? pendingAppealsCount : staticBadge;
                const active = linkActive(href);
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
                      <Badge className="h-5 min-w-5 justify-center border-amber-500/30 bg-amber-500/20 px-1 text-[10px] font-semibold text-amber-200">
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
