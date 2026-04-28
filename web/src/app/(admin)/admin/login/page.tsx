import Link from "next/link";
import { Activity } from "lucide-react";

import { signInAdmin } from "@/app/(admin)/admin/actions";
import { site } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminPanelSurface } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

function errorMessage(code: string | undefined) {
  switch (code) {
    case "1":
      return "Enter both email and password.";
    case "auth":
      return "Sign-in failed. Check your email and password.";
    case "forbidden":
      return "This account is not authorized for the admin console.";
    case "config":
      return "Server is missing Supabase configuration. Add environment variables on Vercel.";
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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050a14] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(45,127,249,0.22),transparent)]" />
      <div
        className={cn(
          adminPanelSurface,
          "relative w-full max-w-md rounded-2xl border-white/10 bg-[rgba(12,21,36,0.85)] p-8 shadow-[0_24px_80px_-32px_rgba(45,127,249,0.35)] backdrop-blur-md",
        )}
      >
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#0066ff] text-white shadow-lg shadow-primary/30">
            <Activity className="h-6 w-6" strokeWidth={2.2} aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">{site.name} admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Staff sign-in. Your profile must have <span className="text-foreground/90">role_admin</span> in Supabase.
          </p>
        </div>
        {err && (
          <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-200">
            {err}
          </p>
        )}
        <form action={signInAdmin} className="space-y-4">
          <input type="hidden" name="next" value={q.next && q.next.startsWith("/admin") ? q.next : ""} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@organization.org"
              className="border-white/10 bg-white/[0.04]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="border-white/10 bg-white/[0.04]"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary font-semibold text-primary-foreground shadow-[0_0_24px_-8px_rgba(45,127,249,0.8)]"
          >
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            ← Back to marketing site
          </Link>
        </p>
      </div>
    </div>
  );
}
