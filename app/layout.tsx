import type { Metadata, Viewport } from "next";
import { Figtree, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { business } from "@/lib/config/business";
import { getPublicBusinessSettings } from "@/lib/public-data";
import { getSiteAssetUrl } from "@/lib/storage";
import { resolveSeo, resolveSiteBaseUrl } from "@/lib/seo";
import { RegisterServiceWorker } from "./RegisterServiceWorker";
import { PwaUpdateBanner } from "./PwaUpdateBanner";
import { AppUpdateBanner } from "./AppUpdateBanner";
import { TrackLinkClicks } from "./TrackLinkClicks";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Títulos: serif con remates, eco del "MW" del logo (docs/diseno.md).
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffaf2" },
    { media: "(prefers-color-scheme: dark)", color: "#1a120d" },
  ],
  viewportFit: "cover",
};

/**
 * Ícono: si Franco sube un logo en /admin/negocio (Supabase Storage) se usa
 * ese; si no, los estáticos de `public/brand` y `public/favicon.ico`.
 */
export async function generateMetadata(): Promise<Metadata> {
  const fallbackSeo = resolveSeo(null);
  const staticIcons = {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: "/brand/apple-touch-icon.png",
  };
  const base: Metadata = {
    title: fallbackSeo.title,
    description: fallbackSeo.description,
    applicationName: business.name,
    icons: staticIcons,
    openGraph: {
      type: "website",
      locale: "es_MX",
      siteName: business.name,
      title: fallbackSeo.title,
      description: fallbackSeo.description,
      images: [{ url: "/brand/icon-512.png", alt: business.name }],
    },
    twitter: { card: "summary", title: fallbackSeo.title, description: fallbackSeo.description },
  };

  try {
    const settings = await getPublicBusinessSettings();
    const seo = resolveSeo(settings);
    const siteUrl = resolveSiteBaseUrl(settings);
    const logoUrl = getSiteAssetUrl(settings.logo_path);

    base.metadataBase = new URL(siteUrl);
    base.title = seo.title;
    base.description = seo.description;
    base.openGraph = {
      type: "website",
      locale: "es_MX",
      siteName: business.name,
      title: seo.title,
      description: seo.description,
      url: siteUrl,
      images: [{ url: logoUrl ?? "/brand/icon-512.png", alt: business.name }],
    };
    base.twitter = { card: "summary", title: seo.title, description: seo.description };
    if (logoUrl) {
      base.icons = { icon: logoUrl, apple: logoUrl, shortcut: logoUrl };
    }
  } catch {
    // Sin conexión a Supabase al momento de renderizar: se queda con los valores por defecto.
  }

  return base;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${figtree.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e;});",
          }}
        />
        {children}
        <RegisterServiceWorker />
        <PwaUpdateBanner />
        <AppUpdateBanner />
        <Analytics />
        <TrackLinkClicks />
      </body>
    </html>
  );
}
