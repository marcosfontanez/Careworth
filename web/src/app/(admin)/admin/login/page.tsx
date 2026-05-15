import Image from "next/image";

import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { pulseverseLogoLockup } from "@/lib/design-tokens";
import { adminPanelSurface } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

function errorMessage(code: string | undefined) {
  switch (code) {
    case "1":
      return "Enter both email and password.";
    case "auth":
      return "Sign-in failed. Check your email and password.";
    case "confirm":
      return "Confirm your email first — Supabase sent a link when you signed up. Or use “Forgot password” in the mobile app / Supabase dashboard to resend.";
    case "forbidden":
      return "This account is not authorized for the admin console.";
    case "config":
      return process.env.VERCEL === "1"
        ? "Supabase isn’t configured on this deployment. In Vercel: Project → Settings → Environment Variables — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (from Supabase → Project Settings → API), apply to Production, then Redeploy."
        : "Supabase isn’t configured locally. In web/, ensure .env.local sets NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart npm run dev.";
    default:
      return null;
  }
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const q = await searchParams;
  const err = errorMessage(q.error);
  const adminNext =
    q.next &&
    q.next.startsWith("/admin") &&
    !q.next.startsWith("//") &&
    q.next !== "/admin/login"
      ? q.next
      : "";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-pv-navy-deep px-4 outline-none"
    >
      {/* Layered cinematic backdrop — matches premium visual system. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_-15%,rgba(45,127,249,0.18),transparent_55%),radial-gradient(ellipse_60%_45%_at_50%_120%,rgba(20,184,166,0.10),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/3 -z-10 h-[360px] w-[360px] rounded-full bg-primary/10 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-1/4 -z-10 h-[320px] w-[320px] rounded-full bg-[var(--accent)]/10 blur-[110px]"
      />

      <div
        className={cn(
          adminPanelSurface,
          "relative w-full max-w-md overflow-hidden rounded-2xl border-white/10 bg-[rgba(12,21,36,0.78)] p-8 ring-1 ring-white/[0.04] backdrop-blur-xl",
          "shadow-[0_30px_90px_-30px_rgba(45,127,249,0.45),0_0_0_1px_rgba(45,127,249,0.10)]",
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
                className="h-32 w-auto max-w-[min(92vw,360px)] object-contain sm:h-36"
              />
            </div>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Staff portal
            </span>
            <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-foreground">Staff admin</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              For PulseVerse staff accounts only. After sign-in, use the sidebar for dashboard, moderation, and{" "}
              <span className="text-foreground/90">Shop &amp; borders</span>.
            </p>
          </div>
          {err && (
            <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-200">
              {err}
            </p>
          )}
          <AdminLoginForm nextPath={adminNext} />
        </div>
      </div>
    </main>
  );
}
