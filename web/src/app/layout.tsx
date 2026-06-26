import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import { preconnect, prefetchDNS } from "react-dom";
import "./globals.css";
import { SiteAnalytics } from "@/components/site-analytics";
import { SkipToMain } from "@/components/skip-to-main";
import { site } from "@/lib/design-tokens";
import { isVercelPreviewDeployment } from "@/lib/deployment-env";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { PV_LOCALE_COOKIE } from "@/lib/locale-preference";
import { getPublicSiteUrl } from "@/lib/site-url";
import { getSupabaseUrlAndAnon } from "@/lib/supabase/public-env";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  adjustFontFallback: true,
  weight: ["400", "500", "600", "700"],
});

/* Distinctive display face for headlines; body copy stays on Inter. */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#050a14",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  applicationName: site.name,
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  ...(isVercelPreviewDeployment()
    ? { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } }
    : {}),
  openGraph: {
    title: site.name,
    description: site.description,
    siteName: site.name,
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.description,
    images: ["/opengraph-image"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const raw = jar.get(PV_LOCALE_COOKIE)?.value;
  const htmlLang = raw && isLocale(raw) ? raw : DEFAULT_LOCALE;

  /* Warm the connection to Supabase so the first client-side auth/data call
     doesn't pay full DNS + TLS setup. Free, safe resource hint. */
  const supabaseCreds = getSupabaseUrlAndAnon();
  if (supabaseCreds?.url) {
    prefetchDNS(supabaseCreds.url);
    preconnect(supabaseCreds.url, { crossOrigin: "anonymous" });
  }

  return (
    <html lang={htmlLang} className={`dark ${inter.variable} ${spaceGrotesk.variable} min-h-dvh scroll-smooth`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <Script id="pv-auth-callback-redirect" strategy="afterInteractive">
          {`
(function(){
  try {
    var p = location.pathname || "";
    if (p.indexOf("/auth/confirm") === 0) return;
    var s = location.search || "";
    var h = location.hash || "";
    if (s.indexOf("code=") !== -1) {
      location.replace("/auth/confirm" + s + h);
      return;
    }
    var raw = h.charAt(0) === "#" ? h.slice(1) : h;
    if (raw.indexOf("access_token=") !== -1 && raw.indexOf("refresh_token=") !== -1) {
      location.replace("/auth/confirm" + s + h);
    }
  } catch (e) {}
})();
          `}
        </Script>
        <SkipToMain />
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
