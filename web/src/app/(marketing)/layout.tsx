import { AppJsonLd } from "@/components/json-ld";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav, type MarketingAccountChip } from "@/components/marketing/marketing-nav";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { organizationAndWebsiteGraph } from "@/lib/structured-data";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

async function loadMarketingAccount(): Promise<MarketingAccountChip> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", user.id)
      .maybeSingle();
    return {
      userId: user.id,
      displayName: profile?.display_name ?? null,
      username: profile?.username ?? null,
    };
  } catch {
    return null;
  }
}

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getMarketingLocale();
  const account = await loadMarketingAccount();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <AppJsonLd data={organizationAndWebsiteGraph()} />
      <MarketingNav locale={locale} account={account} />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
