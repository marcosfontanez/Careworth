import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { SiteAnalytics } from "@/components/site-analytics";
import { SkipToMain } from "@/components/skip-to-main";
import { site } from "@/lib/design-tokens";
import { isVercelPreviewDeployment } from "@/lib/deployment-env";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { PV_LOCALE_COOKIE } from "@/lib/locale-preference";
import { getPublicSiteUrl } from "@/lib/site-url";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  adjustFontFallback: true,
  weight: ["400", "500", "600", "700"],
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

  return (
    <html lang={htmlLang} className={`dark ${inter.variable} min-h-dvh`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <SkipToMain />
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
