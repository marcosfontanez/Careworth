import Image from "next/image";

import { MarketingLoginForm } from "@/components/auth/marketing-login-form";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { getLoginPageCopy } from "@/lib/marketing-copy/login-page";
import { pulseverseLogoLockup } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

function errorMessage(code: string | undefined) {
  switch (code) {
    case "1":
      return "Enter both email and password.";
    case "auth":
      return "Sign-in failed. Check your email and password.";
    case "confirm":
      return "Confirm your email first (check your inbox for the Supabase link), then try again.";
    case "config":
      return "This site is not connected to PulseVerse yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the deployment, then redeploy.";
    default:
      return null;
  }
}

export default async function UserLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const q = await searchParams;
  const err = errorMessage(q.error);
  const locale = await getMarketingLocale();
  const c = getLoginPageCopy(locale);

  const next =
    q.next && q.next.startsWith("/") && !q.next.startsWith("//") && !q.next.startsWith("/admin")
      ? q.next
      : "";

  return (
    <div
      className={cn(
        "relative isolate flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center overflow-hidden px-4 py-16",
      )}
    >
      {/* Layered cinematic backdrop — matches premium visual system. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_55%_at_50%_-15%,rgba(20,184,166,0.16),transparent_55%),radial-gradient(ellipse_55%_45%_at_50%_120%,rgba(45,127,249,0.10),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/3 -z-10 h-[360px] w-[360px] rounded-full bg-accent/10 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-1/4 -z-10 h-[320px] w-[320px] rounded-full bg-primary/10 blur-[110px]"
      />

      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.78)] p-8 ring-1 ring-white/4 backdrop-blur-xl",
          "shadow-[0_30px_90px_-30px_rgba(20,184,166,0.45),0_0_0_1px_rgba(20,184,166,0.10)]",
        )}
      >
        {/* Soft inner highlight to lift the glass edge. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_60%_at_50%_-10%,rgba(255,255,255,0.06),transparent_55%)]"
        />
        <div className="relative">
          <div className="mb-8 text-center">
            <div className="mx-auto flex justify-center">
              <Image
                src={pulseverseLogoLockup.src}
                alt=""
                width={pulseverseLogoLockup.width}
                height={pulseverseLogoLockup.height}
                priority
                sizes="(max-width: 640px) 92vw, 360px"
                className="h-28 w-auto max-w-[min(92vw,320px)] object-contain sm:h-32"
              />
            </div>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-(--accent)/30 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              Welcome back
            </span>
            <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground">{c.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{c.subtitle}</p>
          </div>
          {err && (
            <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-200">
              {err}
            </p>
          )}
          <MarketingLoginForm locale={locale} c={c} nextPath={next || "/me"} />
        </div>
      </div>
    </div>
  );
}
