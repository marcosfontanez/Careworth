import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type WebAppAccount = {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  audienceRole: string | null;
  interests: string[];
  onboardingCompletedAt: string | null;
  termsPrivacyAcceptedAt: string | null;
  needsOnboarding: boolean;
};

/** Load the signed-in PulseVerse account, or `null` when signed out / unconfigured. */
export async function getWebAppAccount(): Promise<WebAppAccount | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [{ data: profile }, { data: interestRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "display_name, username, avatar_url, audience_role, onboarding_completed_at, terms_and_privacy_accepted_at",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_interests").select("interest").eq("user_id", user.id),
    ]);

    const termsPrivacyAcceptedAt = profile?.terms_and_privacy_accepted_at ?? null;
    const onboardingCompletedAt = profile?.onboarding_completed_at ?? null;
    const needsOnboarding =
      Boolean(termsPrivacyAcceptedAt && String(termsPrivacyAcceptedAt).trim()) &&
      !onboardingCompletedAt;

    return {
      id: user.id,
      displayName: profile?.display_name ?? null,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      audienceRole: profile?.audience_role ?? null,
      interests: (interestRows ?? []).map((r) => String(r.interest)),
      onboardingCompletedAt,
      termsPrivacyAcceptedAt,
      needsOnboarding,
    };
  } catch {
    return null;
  }
}

/**
 * Require a signed-in account for a protected `/web-app/*` surface. Redirects to
 * login (preserving the return path) when signed out — never renders a broken
 * page for anonymous visitors.
 */
export async function requireWebAppAccount(nextPath: string): Promise<WebAppAccount> {
  const account = await getWebAppAccount();
  if (!account) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return account;
}
