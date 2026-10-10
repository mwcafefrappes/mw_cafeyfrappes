import type { MetadataRoute } from "next";
import { business } from "@/lib/config/business";
import { getPublicBusinessSettings } from "@/lib/public-data";
import { getSiteAssetUrl, guessImageMimeType } from "@/lib/storage";

// El logo puede cambiar desde /admin/negocio: se lee la base en cada request.
export const dynamic = "force-dynamic";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

/**
 * Tamaño real del logo subido (solo PNG, leyendo los primeros 24 bytes):
 * si lo declarado no coincide, Chrome puede no ofrecer instalar la app
 * (lección de Axel Style, 2026-10-06).
 */
async function getPngSize(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-23" }, next: { revalidate: 3600 } });
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length < 24 || PNG_SIGNATURE.some((b, i) => bytes[i] !== b)) return null;
    const view = new DataView(bytes.buffer);
    return `${view.getUint32(16)}x${view.getUint32(20)}`;
  } catch {
    return null;
  }
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getPublicBusinessSettings().catch(() => null);
  const logoUrl = settings ? getSiteAssetUrl(settings.logo_path) : null;
  const logoSize = logoUrl ? ((await getPngSize(logoUrl)) ?? "512x512") : null;

  return {
    id: "/",
    name: business.name,
    short_name: business.shortName,
    description: `Menú y pedidos de ${business.name}: café, frappés y waffles en Huatulco.`,
    lang: "es-MX",
    // La app instalada abre en el menú (decisión del usuario 2026-10-09); el `id` se queda en "/".
    start_url: "/menu",
    scope: "/",
    shortcuts: [
      { name: "Ver el menú", short_name: "Menú", url: "/menu" },
      { name: "Mis pedidos", short_name: "Mis pedidos", url: "/mis-pedidos" },
    ],
    display: "standalone",
    background_color: "#1a120d",
    theme_color: "#3a2318",
    icons: logoUrl
      ? [{ src: logoUrl, sizes: logoSize ?? "512x512", type: guessImageMimeType(logoUrl), purpose: "any" }]
      : [
          { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
  };
}
