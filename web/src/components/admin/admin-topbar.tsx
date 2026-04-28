import { Bell, HelpCircle, Search, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminTopbar() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-[rgba(5,10,20,0.72)] px-4 backdrop-blur-md md:gap-6 md:px-6">
      <Button variant="ghost" size="icon" className="hidden shrink-0 text-muted-foreground sm:flex" aria-label="Security">
        <Shield className="h-5 w-5" />
      </Button>
      <div className="relative mx-auto flex w-full max-w-2xl min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search reports, users, content, circles…"
          className="h-10 border-white/10 bg-white/[0.04] pl-9 pr-20 text-sm placeholder:text-muted-foreground"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] justify-center border-primary/30 bg-primary px-0.5 p-0 text-[9px] font-bold leading-none text-primary-foreground">
            8
          </Badge>
        </Button>
        <Button variant="ghost" size="icon" className="hidden text-muted-foreground sm:flex" aria-label="Help">
          <HelpCircle className="h-5 w-5" />
        </Button>
        <div className="ml-1 flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2">
          <div
            className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-primary to-[#0066ff] ring-2 ring-white/10"
            aria-hidden
          />
          <div className="hidden min-w-0 leading-tight lg:block">
            <p className="truncate text-sm font-semibold text-foreground">Admin User</p>
            <p className="text-xs text-muted-foreground">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
