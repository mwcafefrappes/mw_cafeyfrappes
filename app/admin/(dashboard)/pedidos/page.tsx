import { requireAdminUser } from "@/lib/admin/auth";
import { getBusinessSettingsAdmin, getOrdersBoardAdmin } from "@/lib/admin/data";
import { env } from "@/lib/config/business";
import { mexicoDay, slotIso } from "@/lib/order-slots";
import { parseTimeFormat } from "@/lib/time-format";
import { OrdersBoard } from "./OrdersBoard";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requireAdminUser();
  const now = new Date();
  const [orders, settings] = await Promise.all([getOrdersBoardAdmin(slotIso(mexicoDay(now), 0)), getBusinessSettingsAdmin()]);

  return (
    <OrdersBoard
      orders={orders}
      timeFormat={parseTimeFormat(settings.time_format)}
      defaultFeeCents={settings.delivery_fee_cents}
      serverNow={now.getTime()}
      supabaseUrl={env.supabaseUrl}
      supabaseAnonKey={env.supabaseAnonKey}
    />
  );
}
