import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  Headphones,
  Mail,
  MessageCircle,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { SupportFaqAccordion } from "@/components/marketing/support-faq-accordion";
import { marketingCardMuted, marketingEyebrow, marketingGutterX, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { getSupportEmail } from "@/lib/site-constants";
import { supportFaqItems } from "@/mock/marketing";

const helpTiles = [
  { title: "Account", body: "Sign-in, verification, and device basics.", icon: BookOpen },
  { title: "Safety", body: "Reports, appeals, and urgent live incidents.", icon: Shield },
  { title: "Circles", body: "Joining rooms, invites, and moderation context.", icon: MessageCircle },
  { title: "Live", body: "Going live, co-hosts, and chat controls.", icon: Sparkles },
  { title: "Pulse Page", body: "Profiles, pins, and professional presence.", icon: BarChart3 },
  { title: "Partners", body: "Press, access programs, and institution pilots.", icon: Headphones },
] as const;

export function SupportCenterContent() {
  const supportEmail = getSupportEmail();
  const contactCards = [
    {
      title: "Contact support",
      body: "Priority threads for trust & safety and access issues.",
      icon: Headphones,
      href: "/contact",
    },
    { title: "Email us", body: supportEmail, icon: Mail, href: `mailto:${supportEmail}` },
    {
      title: "Response time",
      body: "We typically respond within 24–48 business hours.",
      icon: Clock,
      href: "/faq",
      badge: "24–48h avg.",
    },
  ] as const;
  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-8 sm:pt-12">
        <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-primary/10 blur-[90px]" />
        <div className={cn(marketingGutterX, "relative grid gap-12 lg:grid-cols-2 lg:items-center")}>
          <div>
            <p className={marketingEyebrow}>Support center</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              Help for every part of{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-primary bg-clip-text text-transparent">CareWorth.</span>
            </h1>
            <div className="mt-8 flex gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 ring-1 ring-white/[0.05]">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-[rgba(5,10,20,0.6)] px-4 py-3 text-sm text-muted-foreground">
                <Search className="h-4 w-4 shrink-0 text-primary" />
                Search help articles…
              </div>
              <Button className={cn("shrink-0 rounded-xl px-6 font-semibold", shadowPrimaryCta, "bg-primary")}>Search</Button>
            </div>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              Popular:{" "}
              <Link href="/faq" className="text-primary hover:underline">
                Account settings
              </Link>
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy
              </Link>
              <Link href="/community-guidelines" className="text-primary hover:underline">
                Guidelines
              </Link>
            </p>
          </div>
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative h-56 w-56 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-primary/20 shadow-[0_24px_80px_-24px_rgba(45,127,249,0.45)] ring-1 ring-primary/25 sm:h-72 sm:w-72">
              <div className="absolute inset-6 rounded-2xl bg-[rgba(5,10,20,0.85)] ring-1 ring-white/10" />
              <MessageCircle className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-[var(--accent)] opacity-90" />
            </div>
          </div>
        </div>
      </section>

      <MarketingPageShell className="!py-0 pb-20">
        <h2 className="text-2xl font-bold text-foreground">How can we help you today?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {helpTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div key={tile.title} className={cn("rounded-2xl p-6", marketingCardMuted)}>
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{tile.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tile.body}</p>
                <Link
                  href="/faq"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  View articles
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-14">
          <div>
            <p className={marketingEyebrow}>FAQ</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">Frequently asked questions</h2>
            <Button asChild variant="outline" className="mt-6 border-white/15 bg-transparent">
              <Link href="/faq">Browse all articles</Link>
            </Button>
          </div>
          <SupportFaqAccordion items={supportFaqItems} />
        </div>

        <div className="mt-20">
          <h2 className="text-2xl font-bold text-foreground">Still need help?</h2>
          <p className="mt-2 text-muted-foreground">Our team is here for you.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {contactCards.map((c) => {
              const Icon = c.icon;
              const inner = (
                <div className={cn("h-full rounded-2xl p-6", marketingCardMuted)}>
                  <Icon className="h-8 w-8 text-primary" />
                  <h3 className="mt-4 font-semibold text-foreground">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
                  {"badge" in c && c.badge ? (
                    <span className="mt-3 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                      {c.badge}
                    </span>
                  ) : null}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    {c.href.startsWith("mailto") ? "Send an email" : "Contact us"}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              );
              return c.href.startsWith("mailto") ? (
                <a key={c.title} href={c.href} className="group block">
                  {inner}
                </a>
              ) : (
                <Link key={c.title} href={c.href} className="group block">
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {(
            [
              {
                title: "Safety & reporting",
                body: "In-app flags route to trained moderators with clinical context.",
                icon: Shield,
                href: "/community-guidelines",
              },
              {
                title: "Community guidelines",
                body: "How we protect culture without chilling good-faith debate.",
                icon: BookOpen,
                href: "/community-guidelines",
              },
              {
                title: "Privacy & security",
                body: "Data minimization, retention controls, and terms in our Privacy Policy.",
                icon: Sparkles,
                href: "/privacy",
              },
            ] as const
          ).map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className={cn("rounded-2xl p-6", marketingCardMuted)}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mt-4 text-center text-lg font-semibold text-foreground">{b.title}</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">{b.body}</p>
                <Link href={b.href} className="mt-4 block text-center text-sm font-semibold text-primary hover:underline">
                  Learn more
                </Link>
              </div>
            );
          })}
        </div>

        <div className="relative mt-20 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0c1f4a]/90 via-[rgba(5,10,20,0.95)] to-primary/20 p-8">
          <h3 className="text-lg font-bold text-foreground">Subscribe to help updates</h3>
          <p className="mt-1 text-sm text-muted-foreground">Product changes, trust &amp; safety notices, and Live ops tips.</p>
          <div className="mt-4 max-w-md">
            <NewsletterSignup source="support" />
          </div>
        </div>
      </MarketingPageShell>
    </>
  );
}
