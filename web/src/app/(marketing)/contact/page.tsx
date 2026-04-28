import { SectionHeader } from "@/components/marketing/section-header";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { marketingCardMuted } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export default function ContactPage() {
  return (
    <MarketingPageShell width="form">
      <SectionHeader
        title="Contact"
        description="Partnerships, press, trust & safety, and early access — we read every note."
      />
      <form className={cn("mt-10 space-y-4 rounded-2xl p-6 sm:p-8", marketingCardMuted)}>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Your name" className="border-white/10 bg-white/[0.04]" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@health.org" className="border-white/10 bg-white/[0.04]" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="msg">Message</Label>
          <Textarea id="msg" placeholder="How can we help?" className="min-h-28 border-white/10 bg-white/[0.04]" />
        </div>
        <Button type="button" className={cn("w-full font-semibold", "bg-primary text-primary-foreground shadow-[0_0_24px_-8px_rgba(45,127,249,0.55)]")}>
          Send (mock — wire to API later)
        </Button>
      </form>
    </MarketingPageShell>
  );
}
