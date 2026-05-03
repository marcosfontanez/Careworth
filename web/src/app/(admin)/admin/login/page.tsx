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
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#050a14] px-4 outline-none"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(45,127,249,0.22),transparent)]" />
      <div
        className={cn(
          adminPanelSurface,
          "relative w-full max-w-md rounded-2xl border-white/10 bg-[rgba(12,21,36,0.85)] p-8 shadow-[0_24px_80px_-32px_rgba(45,127,249,0.35)] backdrop-blur-md",
        )}
      >
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
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">Staff admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">For PulseVerse staff accounts only.</p>
        </div>
        {err && (
          <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-200">
            {err}
          </p>
        )}
        <AdminLoginForm nextPath={adminNext} />
      </div>
    </main>
  );
}
