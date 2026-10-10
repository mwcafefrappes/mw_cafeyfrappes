import type { Metadata } from "next";
import { business } from "@/lib/config/business";
import { getPublicBusinessSettings, getPublicMenu } from "@/lib/public-data";
import { getSiteAssetUrl } from "@/lib/storage";
import { parseTimeFormat } from "@/lib/time-format";
import { parseWeeklyHours } from "@/lib/weekly-hours";
import { MenuView } from "./MenuView";
import { toMenuCategoryViews } from "./view-model";

// Estática con revalidación: los cambios de /admin (precio, agotado…) se
// ven en menos de un minuto. Lo que depende de la URL (`?mesa=`,
// `?producto=`) y de la hora se resuelve en el navegador (client-state.ts).
export const revalidate = 60;

export const metadata: Metadata = {
  title: `Menú · ${business.name}`,
  description: "Waffles, café, frappés, crepas y sodas italianas en Huatulco. Mira precios, tamaños y extras.",
  alternates: { canonical: "/menu" },
};

export default async function MenuPage() {
  const [settings, menu] = await Promise.all([getPublicBusinessSettings(), getPublicMenu()]);

  const categories = toMenuCategoryViews(menu);

  return (
    <MenuView
      categories={categories}
      hours={parseWeeklyHours(settings.weekly_hours)}
      timeFormat={parseTimeFormat(settings.time_format)}
      serverNow={new Date().getTime()}
      canOrder={settings.order_pickup_enabled || settings.order_table_enabled}
      iconUrl={getSiteAssetUrl(settings.logo_path)}
    />
  );
}
