import type { Metadata } from "next";

import { WebAppLanding } from "@/components/web-app/web-app-landing";
import { WebAppShell } from "@/components/web-app/web-app-shell";
import { getWebAppPageCopy } from "@/lib/marketing-copy/web-app";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function expoWebAppUrl(): string | null {
  return process.env.NEXT_PUBLIC_EXPO_WEB_APP_URL?.trim() || null;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    // Index the public landing only when the app is actually connected.
    robots: expoWebAppUrl() ? undefined : { index: false, follow: false },
  };
}

type WebAppAccount = {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

async function loadAccount(): Promise<WebAppAccount | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    return {
      displayName: profile?.display_name ?? null,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    };
  } catch {
    return null;
  }
}

export default async function WebAppPage() {
  const locale = await getMarketingLocale();
  const c = getWebAppPageCopy(locale);
  const appUrl = expoWebAppUrl();
  const account = await loadAccount();

  // Signed out → polished public landing with a login CTA.
  if (!account) {
    return <WebAppLanding copy={c.landing} />;
  }

  // Signed in → the responsive PulseVerse Web shell.
  return <WebAppShell appUrl={appUrl} account={account} copy={c.shell} />;
}
