import Link from "next/link";
import { SectionHeader } from "@/components/marketing/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { marketingEyebrow, marketingShell, marketingCardMuted } from "@/lib/ui-classes";

export function FeatureDetailPage({
  eyebrow,
  title,
  subtitle,
  body,
  bullets,
  steps,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  bullets: string[];
  steps: { title: string; body: string }[];
}) {
  return (
    <article className={marketingShell}>
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeader eyebrow={eyebrow} title={title} description={subtitle} />
      </div>

      <p className="mx-auto mt-10 max-w-3xl text-center text-lg leading-relaxed text-muted-foreground md:text-left">
        {body}
      </p>

      <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <h2 className={marketingEyebrow}>Why it matters</h2>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            {bullets.map((b) => (
              <li key={b} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={marketingEyebrow}>How it works</h2>
          <div className="mt-4 space-y-4">
            {steps.map((step, i) => (
              <Card key={step.title} className={marketingCardMuted}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-baseline gap-2 text-base font-semibold">
                    <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    {step.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">{step.body}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        <div className="aspect-[4/3] rounded-2xl border border-dashed border-border/80 bg-gradient-to-br from-card/80 to-pv-navy/40 p-6 lg:col-span-2">
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-foreground">Product frame</p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Drop in screenshots or Lottie — this surface is sized for marketing parity with your app captures.
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-3 rounded-2xl border border-border/80 bg-card/40 p-6 ring-1 ring-white/[0.04]">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Need the full pillar map? Start from the feature hub or jump to adjacent surfaces.
          </p>
          <Button variant="outline" className="w-full border-primary/30" asChild>
            <Link href="/features">All features</Link>
          </Button>
          <Button className="w-full bg-primary text-primary-foreground" asChild>
            <Link href="/download">Join early access</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
