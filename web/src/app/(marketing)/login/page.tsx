import Image from "next/image";
import Link from "next/link";

import { signInUser } from "@/app/(marketing)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { getLoginPageCopy } from "@/lib/marketing-copy/login-page";
import { marketingInlineLink } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

function errorMessage(code: string | undefined) {
  switch (code) {
    case "1":
      return "Enter both email and password.";
    case "auth":
      return "Sign-in failed. Check your email and password.";
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
        "relative flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center px-4 py-16",
        "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,184,166,0.12),transparent)]",
      )}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.85)] p-8 shadow-[0_24px_80px_-32px_rgba(20,184,166,0.25)] backdrop-blur-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex justify-center">
            <Image
              src="/brand/pulseverse-logo.svg"
              alt=""
              width={280}
              height={300}
              priority
              unoptimized
              sizes="(max-width: 640px) 92vw, 360px"
              className="h-28 w-auto max-w-[min(92vw,320px)] object-contain sm:h-32"
            />
          </div>
          <h1 className="mt-5 font-heading text-2xl font-bold tracking-tight text-foreground">{c.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{c.subtitle}</p>
        </div>
        {err && (
          <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-200">
            {err}
          </p>
        )}
        <form action={signInUser} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="space-y-2">
            <Label htmlFor="email">{c.emailLabel}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder={c.emailPlaceholder}
              className="border-white/10 bg-white/[0.04]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{c.passwordLabel}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="border-white/10 bg-white/[0.04]"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary font-semibold text-primary-foreground shadow-[0_0_24px_-8px_rgba(45,127,249,0.8)]"
          >
            {c.submit}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {c.newUser}{" "}
          <Link href="/download" className={marketingInlineLink}>
            {c.getTheApp}
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/admin/login" className={marketingInlineLink}>
            {c.staffLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
