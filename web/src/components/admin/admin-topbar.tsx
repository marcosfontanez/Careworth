"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, HelpCircle, Search, Shield } from "lucide-react";

import type { AdminNotificationDigest } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function AdminTopbar({
  staffName,
  staffSubtitle,
  notifications,
}: {
  staffName: string;
  staffSubtitle: string;
  notifications: AdminNotificationDigest;
}) {
  const router = useRouter();
  const count = notifications.unreadCount;
  const [notifOpen, setNotifOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [notifOpen]);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-[rgba(5,10,20,0.72)] px-4 backdrop-blur-md md:gap-6 md:px-6">
      <Button variant="ghost" size="icon" className="hidden shrink-0 text-muted-foreground sm:flex" asChild>
        <Link href="/admin/moderation" aria-label="Moderation">
          <Shield className="h-5 w-5" />
        </Link>
      </Button>
      <div className="relative mx-auto flex w-full max-w-2xl min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search reports, users, circles… (navigation coming)"
          className="h-10 border-white/10 bg-white/4 pl-9 pr-20 text-sm placeholder:text-muted-foreground"
          readOnly
          aria-readonly
          tabIndex={-1}
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 bg-white/6 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div ref={panelRef} className="relative">
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "relative text-muted-foreground",
            )}
            aria-expanded={notifOpen}
            aria-haspopup="dialog"
            aria-label={`Notifications${count ? `, ${count} items` : ""}`}
            onClick={() => setNotifOpen((o) => !o)}
          >
            <Bell className="h-5 w-5" />
            {count > 0 ? (
              <Badge className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] justify-center border-primary/30 bg-primary px-0.5 p-0 text-[9px] font-bold leading-none text-primary-foreground">
                {count > 99 ? "99+" : count}
              </Badge>
            ) : null}
          </button>
          {notifOpen ? (
            <div
              role="dialog"
              aria-label="Ops queue"
              className="absolute right-0 top-full z-[100] mt-1.5 w-[min(22rem,calc(100vw-2rem))] max-h-[min(24rem,70vh)] overflow-y-auto rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
            >
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Ops queue</p>
              <div className="border-t border-border pt-1" />
              {notifications.items.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No pending reports or appeals. You&apos;re caught up.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {notifications.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setNotifOpen(false);
                          router.push(item.href);
                        }}
                      >
                        <span className="font-medium text-foreground">{item.title}</span>
                        <span className="line-clamp-2 text-xs text-muted-foreground">{item.subtitle}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(item.at)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-1 border-t border-border pt-1" />
              <button
                type="button"
                className="w-full rounded-md px-2 py-2 text-left text-sm text-primary hover:bg-accent"
                onClick={() => {
                  setNotifOpen(false);
                  router.push("/admin/moderation");
                }}
              >
                Open moderation
              </button>
            </div>
          ) : null}
        </div>
        <Button variant="ghost" size="icon" className="hidden text-muted-foreground sm:flex" asChild>
          <Link href="/support" aria-label="Help">
            <HelpCircle className="h-5 w-5" />
          </Link>
        </Button>
        <div className="ml-1 flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2">
          <div
            className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-primary to-[#0066ff] ring-2 ring-white/10"
            aria-hidden
          />
          <div className="hidden min-w-0 leading-tight lg:block">
            <p className="truncate text-sm font-semibold text-foreground">{staffName}</p>
            <p className="truncate text-xs text-muted-foreground">{staffSubtitle}</p>
          </div>
        </div>
      </div>
    </header>
  );
}