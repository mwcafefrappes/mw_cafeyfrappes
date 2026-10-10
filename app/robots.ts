import type { MetadataRoute } from "next";
import { getPublicBusinessSettings } from "@/lib/public-data";
import { resolveSiteBaseUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getPublicBusinessSettings().catch(() => null);
  const siteUrl = resolveSiteBaseUrl(settings);

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/pedido/", "/mis-pedidos"] },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
