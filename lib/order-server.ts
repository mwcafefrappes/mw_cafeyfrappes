/**
 * Pedidos del lado del servidor (service_role): crear, leer por token y
 * avisar al negocio. Las reglas puras están en `orders.ts`,
 * `order-config.ts` y `order-slots.ts`; aquí solo se lee y escribe la BD.
 */

import { randomBytes } from "node:crypto";
import { business, env, getSiteUrl } from "./config/business";
import type { Tables } from "./database.types";
import { distanceMeters, mapsPointUrl } from "./geo";
import { sendOwnerEmail } from "./gmail";
import { createOrderEvent, deleteOrderEvent } from "./google-calendar";
import { formatMXN } from "./money";
import { buildOrderConfig, type OrderConfig } from "./order-config";
import { orderLineText, orderTypeLabel, phoneLabel, scheduledLabel } from "./order-format";
import { mexicoDay } from "./order-slots";
import { startsOnBoard, UNPAID_CARD_MINUTES, type OrderRequest, type PricedLine, type PricingProduct } from "./orders";
import { PAYMENT_METHOD_LABELS } from "./payment-methods";
import { getPublicBusinessSettings, getPublicMenu, type PublicBusinessSettings } from "./public-data";
import { getServiceSupabase } from "./supabase";
import { parseTimeFormat } from "./time-format";

export type OrderRow = Tables<"orders">;
export type OrderItemRow = Tables<"order_items">;
export interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[];
}

/** Tiempo que ocupa un pedido programado en el calendario del negocio. */
const CALENDAR_EVENT_MINUTES = 15;

/** Productos que se pueden pedir ahora mismo (los ocultos no llegan por RLS; los agotados sí, para avisar). */
export async function getPricingProducts(): Promise<Map<string, PricingProduct>> {
  const menu = await getPublicMenu();
  return new Map(menu.flatMap((category) => category.products).map((product) => [product.id, product]));
}

/** Pedidos programados (no cancelados) por horario, para el máximo por horario. */
export async function getTakenSlots(now: Date): Promise<Map<string, number>> {
  const { data, error } = await getServiceSupabase()
    .from("orders")
    .select("scheduled_for")
    .not("scheduled_for", "is", null)
    .neq("status", "cancelled")
    .gte("scheduled_for", new Date(now.getTime() - 86_400_000).toISOString());
  if (error) throw error;
  const taken = new Map<string, number>();
  for (const row of data) {
    const iso = new Date(row.scheduled_for!).toISOString().replace(".000Z", "Z");
    taken.set(iso, (taken.get(iso) ?? 0) + 1);
  }
  return taken;
}

/**
 * Cancela los pedidos con tarjeta que no se pagaron a tiempo (nunca
 * salieron en el tablero). Se llama al leer pedidos, en lugar de un cron:
 * Vercel Hobby solo permite uno al día.
 */
export async function expireUnpaidOrders(now: Date): Promise<void> {
  const { error } = await getServiceSupabase()
    .from("orders")
    .update({ status: "cancelled", cancelled_by: "system", updated_at: now.toISOString() })
    .eq("on_board", false)
    .eq("status", "received")
    .eq("payment_status", "pending")
    // Sin página de pago abierta: 60 min desde el pedido; con ella, hasta que vence (`pay_by`).
    .or(`pay_by.lt.${now.toISOString()},and(pay_by.is.null,created_at.lt.${new Date(now.getTime() - UNPAID_CARD_MINUTES * 60_000).toISOString()})`);
  if (error) console.error("[pedidos] no se pudieron cancelar los pedidos sin pagar", error);
}

export async function loadOrderConfig(now: Date): Promise<{ settings: PublicBusinessSettings; config: OrderConfig }> {
  await expireUnpaidOrders(now);
  const [settings, taken] = await Promise.all([getPublicBusinessSettings(), getTakenSlots(now)]);
  return { settings, config: buildOrderConfig(settings, now, taken, env.stripeReady) };
}

export async function getOrderByToken(token: string): Promise<OrderWithItems | null> {
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) return null;
  const { data, error } = await getServiceSupabase().from("orders").select("*, order_items(*)").eq("token", token).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, order_items: [...data.order_items].sort((a, b) => a.sort_order - b.sort_order) };
}

export interface OrderAmounts {
  subtotalCents: number;
  deliveryFeeCents: number | null;
  totalCents: number;
}

/** Crea el pedido con su número del día. Regresa el token para /pedido/<token>. */
export async function insertOrder(request: OrderRequest, lines: PricedLine[], amounts: OrderAmounts, store: { lat: number; lng: number } | null, now: Date): Promise<OrderRow> {
  const supabase = getServiceSupabase();
  const serviceDay = mexicoDay(request.scheduledFor ? new Date(request.scheduledFor) : now);
  const { data: number, error: numberError } = await supabase.rpc("next_order_number", { p_day: serviceDay });
  if (numberError) throw numberError;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      token: randomBytes(24).toString("base64url"),
      service_day: serviceDay,
      number,
      type: request.type,
      table_number: request.table,
      customer_name: request.name,
      customer_phone: request.phone,
      scheduled_for: request.scheduledFor,
      delivery_address: request.delivery?.address ?? null,
      delivery_references: request.delivery?.references || null,
      delivery_lat: request.delivery?.point.lat ?? null,
      delivery_lng: request.delivery?.point.lng ?? null,
      delivery_distance_m: request.delivery && store ? distanceMeters(store, request.delivery.point) : null,
      payment_method: request.paymentMethod,
      subtotal_cents: amounts.subtotalCents,
      delivery_fee_cents: amounts.deliveryFeeCents,
      total_cents: amounts.totalCents,
      on_board: startsOnBoard(request.paymentMethod, amounts.deliveryFeeCents, request.type),
      note: request.note || null,
    })
    .select("*")
    .single();
  if (error) throw error;

  const { error: itemsError } = await supabase.from("order_items").insert(
    lines.map((line, index) => ({
      order_id: order.id,
      product_id: line.productId,
      product_name: line.productName,
      size_name: line.sizeName,
      extras: line.extras,
      unit_cents: line.unitCents,
      quantity: line.quantity,
      line_cents: line.lineCents,
      note: line.note,
      sort_order: index,
    }))
  );
  if (itemsError) {
    // Sin transacciones en supabase-js: si fallan los productos, no dejamos un pedido vacío.
    await supabase.from("orders").delete().eq("id", order.id);
    throw itemsError;
  }
  return order;
}

/** Un producto del pedido como se guarda en `order_items` (o recién calculado). */
export interface NotifyItem {
  product_name: string;
  size_name: string | null;
  extras: unknown;
  quantity: number;
  line_cents: number;
  note: string | null;
}

export function pricedLinesToItems(lines: PricedLine[]): NotifyItem[] {
  return lines.map((line) => ({
    product_name: line.productName,
    size_name: line.sizeName,
    extras: line.extras,
    quantity: line.quantity,
    line_cents: line.lineCents,
    note: line.note,
  }));
}

function orderText(order: OrderRow, items: NotifyItem[], settings: PublicBusinessSettings, now: Date): string {
  const format = parseTimeFormat(settings.time_format);
  const lines = [
    `Pedido #${order.number} · ${orderTypeLabel(order)}`,
    order.scheduled_for ? `Para: ${scheduledLabel(order.scheduled_for, format, now)}` : "Para: lo antes posible",
    `Cliente: ${order.customer_name}${order.customer_phone ? ` · ${phoneLabel(order.customer_phone)}` : ""}`,
    ...(order.type === "delivery" && order.delivery_lat !== null && order.delivery_lng !== null
      ? [
          `Entregar en: ${order.delivery_address}${order.delivery_references ? ` (${order.delivery_references})` : ""}`,
          `Mapa: ${mapsPointUrl({ lat: order.delivery_lat, lng: order.delivery_lng })}`,
        ]
      : []),
    `Pago: ${PAYMENT_METHOD_LABELS[order.payment_method as keyof typeof PAYMENT_METHOD_LABELS]}${order.payment_status === "paid" ? " (pagado)" : ""}`,
    "",
    ...items.map((item) => `• ${orderLineText({ ...item, extras: Array.isArray(item.extras) ? (item.extras as { name: string }[]) : [] })}`),
    "",
    ...(order.type === "delivery" ? [`Envío: ${order.delivery_fee_cents === null ? "por definir (ponlo en el panel)" : formatMXN(order.delivery_fee_cents)}`] : []),
    `Total: ${formatMXN(order.total_cents)}`,
  ];
  if (order.note) lines.push(`Nota: ${order.note}`);
  return lines.join("\n");
}

/**
 * Correo al negocio y, si es programado, evento en Calendar. Nunca lanza.
 * Con tarjeta se llama cuando Stripe confirma el pago (antes el pedido no
 * está en el tablero).
 */
export async function notifyOrderCreated(order: OrderRow, items: NotifyItem[], now: Date): Promise<void> {
  try {
    const settings = await getPublicBusinessSettings();
    const text = orderText(order, items, settings, now);
    const panelUrl = `${getSiteUrl(settings).replace(/\/+$/, "")}/admin/pedidos`;
    await sendOwnerEmail(`Pedido #${order.number} · ${orderTypeLabel(order)} · ${formatMXN(order.total_cents)}`, `${text}\n\nVer en el panel: ${panelUrl}`);

    if (order.scheduled_for) {
      const start = new Date(order.scheduled_for);
      const eventId = await createOrderEvent({
        summary: `Pedido #${order.number} · ${order.customer_name}`,
        description: text,
        startIso: start.toISOString(),
        endIso: new Date(start.getTime() + CALENDAR_EVENT_MINUTES * 60_000).toISOString(),
      });
      if (eventId) await getServiceSupabase().from("orders").update({ calendar_event_id: eventId }).eq("id", order.id);
    }
  } catch (error) {
    console.error("[pedidos] no se pudo avisar del pedido", order.id, error);
  }
}

/** Envío manual: el pedido ya estaba en el tablero; solo se avisa que ya se pagó. Nunca lanza. */
export async function notifyOrderPaid(order: OrderRow): Promise<void> {
  try {
    await sendOwnerEmail(
      `Pedido #${order.number} pagado con tarjeta · ${formatMXN(order.total_cents)}`,
      `${order.customer_name} ya pagó su pedido #${order.number} (${orderTypeLabel(order)}). Ya se puede preparar.`
    );
  } catch (error) {
    console.error("[pedidos] no se pudo avisar del pago", order.id, error);
  }
}

export async function notifyOrderCancelled(order: OrderRow, by: "customer" | "staff"): Promise<void> {
  try {
    if (order.calendar_event_id) await deleteOrderEvent(order.calendar_event_id);
    if (by === "customer") {
      await sendOwnerEmail(
        `Pedido #${order.number} cancelado por el cliente`,
        `${order.customer_name} canceló su pedido #${order.number} (${orderTypeLabel(order)}, ${formatMXN(order.total_cents)}) en ${business.name}.`
      );
    }
  } catch (error) {
    console.error("[pedidos] no se pudo avisar de la cancelación", order.id, error);
  }
}
