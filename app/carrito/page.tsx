import type { Metadata } from "next";
import { business } from "@/lib/config/business";
import { describeNextOpening, getNextOpening } from "@/lib/menu";
import { loadOrderConfig } from "@/lib/order-server";
import { getPublicMenu } from "@/lib/public-data";
import { parseTimeFormat } from "@/lib/time-format";
import { parseWeeklyHours } from "@/lib/weekly-hours";
import { toMenuCategoryViews } from "../menu/view-model";
import { CheckoutView } from "./CheckoutView";

// Horarios con lugar, abierto/cerrado y productos agotados: siempre al momento.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Tu pedido · ${business.name}`,
  robots: { index: false },
};

export default async function CartPage() {
  const now = new Date();
  const [{ settings, config }, menu] = await Promise.all([loadOrderConfig(now), getPublicMenu()]);
  const timeFormat = parseTimeFormat(settings.time_format);
  // Las funciones no viajan al navegador: el carrito recibe los horarios ya calculados (`days`).
  const { pickupEnabled, tableEnabled, deliveryEnabled, delivery, scheduledEnabled, tableCount, methods, openNow } = config.rules;
  const nextOpening = config.rules.openNow ? null : getNextOpening(parseWeeklyHours(settings.weekly_hours), now);

  return (
    <CheckoutView
      products={toMenuCategoryViews(menu).flatMap((category) => category.products)}
      rules={{ pickupEnabled, tableEnabled, deliveryEnabled, delivery, scheduledEnabled, tableCount, methods, openNow }}
      days={config.days}
      timeFormat={timeFormat}
      serverNow={now.getTime()}
      nextOpening={nextOpening ? describeNextOpening(nextOpening, timeFormat) : null}
    />
  );
}
