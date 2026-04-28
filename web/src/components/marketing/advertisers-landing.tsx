import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  Check,
  Globe,
  HeartHandshake,
  LayoutPanelTop,
  Megaphone,
  Radio,
  Shield,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingCardMuted, marketingEyebrow, marketingGutterX, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const audiences = [
  {
    title: "Nurses",
    count: "450K+ professionals",
    body: "Shift culture, floor humor, and education that respects the bedside.",
    tint: "from-sky-500/20 to-blue-900/40",
  },
  {
    title: "Physicians & APPs",
    count: "280K+ professionals",
    body: "Specialty depth, debate, and live teaching without generic noise.",
    tint: "from-primary/25 to-slate-900/50",
  },
  {
    title: "Pharmacists",
    count: "110K+ professionals",
    body: "Drug information, adherence stories, and collaborative care threads.",
    tint: "from-emerald-500/20 to-slate-900/45",
  },
  {
    title: "Allied health",
    count: "120K+ professionals",
    body: "Imaging, lab, therapy, and operations — the whole care team.",
    tint: "from-violet-500/20 to-slate-900/45",
  },
] as const;

const placements = [
  { title: "Sponsored feed", body: "Native cards that match clinician reading patterns.", icon: LayoutPanelTop },
  { title: "Pulse Page takeover", body: "Brand-forward frames on high-trust profiles.", icon: Users },
  { title: "Live sponsorships", body: "Lower-thirds and labels with moderator review.", icon: Video },
  { title: "Circles headers", body: "Community surfaces where specialty culture gathers.", icon: Radio },
] as const;

const driveEngagement = [
  { title: "Peer knowledge", body: "Specialty rooms and threaded expertise.", icon: HeartHandshake },
  { title: "Live education", body: "CME-style moments with interactive Q&A.", icon: Radio },
  { title: "Career signals", body: "Roles, growth, and mentorship visibility.", icon: BarChart2 },
  { title: "Real-world insight", body: "Stories that reflect how care actually feels.", icon: Globe },
] as const;

const solutions = [
  { title: "Sponsored feed", icon: Megaphone },
  { title: "Creator collabs", icon: Users },
  { title: "Circles sponsorships", icon: Radio },
  { title: "Live partnerships", icon: Video },
  { title: "Campaign reporting", icon: BarChart2 },
] as const;

const safetyChecks = [
  "100% professional community",
  "Human content moderation",
  "No DTC pharma spam lanes",
  "Transparent placement labels",
  "Appeals & brand escalation paths",
] as const;

export function AdvertisersLanding() {
  return (
    <>
      <section className="relative overflow-hidden pb-20 pt-10 sm:pt-14">
        <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-primary/15 blur-[100px]" />
        <div className={cn(marketingGutterX, "relative grid gap-14 lg:grid-cols-2 lg:items-center")}>
          <div>
            <p className={marketingEyebrow}>Advertisers &amp; partners</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.35rem]">
              Reach healthcare{" "}
              <span className="bg-gradient-to-r from-primary via-[#4d9fff] to-[var(--accent)] bg-clip-text text-transparent">
                where culture lives.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              PulseVerse is the premium healthcare audience platform where professionals learn, connect, and lead — with
              moderation and category fit baked in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className={cn("h-12 rounded-full px-7 font-semibold", shadowPrimaryCta, "bg-primary text-primary-foreground")}>
                <Link href="/contact" className="inline-flex items-center gap-2">
                  Request media kit
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.04] px-7 font-semibold">
                <Link href="/contact">Talk to partnerships</Link>
              </Button>
            </div>
          </div>
          <div className="relative grid gap-4 sm:grid-cols-2">
            <div className={cn("rounded-2xl border border-white/10 p-5", marketingCardMuted, "sm:translate-y-8")}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Feed preview</p>
              <div className="mt-4 space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs text-muted-foreground">
                    Sponsored insight card {i} · cards / clips / live
                  </div>
                ))}
              </div>
            </div>
            <div className={cn("rounded-2xl border border-white/10 p-5", marketingCardMuted)}>
              <p className="text-xs font-semibold text-muted-foreground">Live placement</p>
              <div className="mt-4 aspect-video rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 ring-1 ring-primary/25">
                <div className="flex h-full items-end p-3 text-[10px] text-white/80">Brand lower-third · verified host</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingPageShell className="!py-0 pb-6">
        <h2 className="max-w-3xl text-2xl font-bold text-foreground sm:text-3xl">
          Premium access to healthcare&apos;s most influential audiences.
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((a) => (
            <div
              key={a.title}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b ring-1 ring-white/[0.04]",
                a.tint,
              )}
            >
              <div className="h-28 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">{a.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
                <p className="mt-auto pt-4 text-lg font-bold text-foreground">{a.count}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className={cn("rounded-2xl p-8", marketingCardMuted)}>
            <p className={marketingEyebrow}>Scale</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {[
                { label: "850K+ healthcare professionals", icon: Users },
                { label: "190+ countries", icon: Globe },
                { label: "25K+ active Circles", icon: Radio },
                { label: "3.7K+ Live sessions hosted", icon: Video },
              ].map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.label} className="flex gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm font-medium text-foreground">{row.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={cn("rounded-2xl p-8", marketingCardMuted)}>
            <h3 className="text-lg font-bold text-foreground">What drives engagement</h3>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {driveEngagement.map((d) => {
                const Icon = d.icon;
                return (
                  <div key={d.title} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{d.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{d.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-20">
          <p className={marketingEyebrow}>High-impact ad placements</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground">Formats built for clinician attention</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {placements.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className={cn("rounded-2xl p-5", marketingCardMuted)}>
                  <div className="mb-12 aspect-[4/3] rounded-xl border border-dashed border-white/15 bg-white/[0.02]" />
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 font-semibold text-foreground">{p.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className={cn("mt-16 grid gap-8 rounded-2xl border border-[var(--accent)]/25 bg-[rgba(12,21,36,0.65)] p-8 lg:grid-cols-2 lg:items-center", marketingCardMuted)}>
          <div>
            <p className={marketingEyebrow}>Brand safe · clinician trusted</p>
            <h2 className="mt-3 text-2xl font-bold text-foreground">Your brand next to content that passes the ward-room test.</h2>
            <ul className="mt-6 space-y-3">
              {safetyChecks.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="flex h-40 w-40 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 shadow-[0_0_60px_-12px_rgba(0,210,255,0.45)]">
              <Shield className="h-20 w-20 text-[var(--accent)]" strokeWidth={1.25} />
            </div>
          </div>
        </div>

        <div className="mt-20">
          <h2 className="text-xl font-bold text-foreground">Partnership solutions</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {solutions.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className={cn("rounded-2xl p-5 text-center", marketingCardMuted)}>
                  <Icon className="mx-auto h-6 w-6 text-primary" />
                  <p className="mt-3 text-sm font-semibold text-foreground">{s.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </MarketingPageShell>
    </>
  );
}
