/**
 * Cobro con tarjeta con Stripe Checkout (Fase 6, CLAUDE.md 5.3). Solo
 * servidor.
 *
 * - "Pagar" abre la página de pago de Stripe (tarjeta, Google Pay, Apple
 *   Pay) con los renglones y el total guardados en la BD.
 * - El pedido se marca pagado SOLO con el webhook
 *   (`checkout.session.completed`), nunca con el regreso del navegador.
 * - Si el pedido ya estaba cancelado cuando llega el pago, se reembolsa
 *   solo. Si el personal cancela un pedido pagado, se reembolsa antes de
 *   cancelarlo.
 */

import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { checkoutLines, paidAmountMatches, paymentDeadline } from "./card-payment";
import { business } from "./config/business";
import { notifyOrderCreated, notifyOrderPaid, type OrderRow, type OrderWithItems } from "./order-server";
import { getStripe } from "./stripe";
import { getServiceSupabase } from "./supabase";

export type CheckoutResult = { kind: "redirect"; url: string } | { kind: "already_paid" };

/** Abre (o reutiliza, si sigue abierta) la página de pago de Stripe del pedido. */
export async function openCheckout(order: OrderWithItems, origin: string, now: Date): Promise<CheckoutResult> {
  const stripe = getStripe();
  if (order.stripe_checkout_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
    if (existing.status === "open" && existing.url) return { kind: "redirect", url: existing.url };
    // Ya pagó y el aviso de Stripe viene en camino: no se cobra dos veces.
    if (existing.status === "complete") return { kind: "already_paid" };
  }

  const deadline = paymentDeadline(order, now);
  const metadata = { order_id: order.id, order_number: String(order.number) };
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      locale: "es-419",
      client_reference_id: order.id,
      metadata,
      payment_intent_data: { description: `${business.name} · Pedido #${order.number}`, metadata },
      line_items: checkoutLines(order, order.order_items).map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: "mxn",
          unit_amount: line.unitCents,
          product_data: { name: line.name, ...(line.description ? { description: line.description } : {}) },
        },
      })),
      success_url: `${origin}/pedido/${order.token}?pagado=1`,
      cancel_url: `${origin}/pedido/${order.token}`,
      expires_at: Math.floor(deadline.getTime() / 1000),
    },
    // Un doble toque en "Pagar" no abre dos páginas de pago.
    { idempotencyKey: `checkout-${order.id}-${order.total_cents}-${Math.floor(now.getTime() / 60_000)}` }
  );
  if (!session.url) throw new Error("Stripe no regresó la página de pago");

  const { error } = await getServiceSupabase()
    .from("orders")
    .update({ stripe_checkout_session_id: session.id, pay_by: deadline.toISOString() })
    .eq("id", order.id);
  if (error) throw error;
  return { kind: "redirect", url: session.url };
}

/** Cierra la página de pago (si sigue abierta) de un pedido que se canceló. Nunca lanza. */
export async function closeCheckout(order: Pick<OrderRow, "id" | "stripe_checkout_session_id">): Promise<void> {
  if (!order.stripe_checkout_session_id) return;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
    if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
  } catch (error) {
    console.error("[stripe] no se pudo cerrar la página de pago", order.id, error);
  }
}

/** Regresa el pago completo de un pedido con tarjeta. Lanza si Stripe falla. */
export async function refundOrder(order: Pick<OrderRow, "id" | "stripe_payment_intent_id">): Promise<void> {
  if (!order.stripe_payment_intent_id) throw new Error(`Pedido ${order.id} sin pago de Stripe`);
  await getStripe().refunds.create({ payment_intent: order.stripe_payment_intent_id }, { idempotencyKey: `refund-${order.id}` });
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  return typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
}

async function loadOrder(id: string): Promise<OrderWithItems | null> {
  const { data, error } = await getServiceSupabase().from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, order_items: [...data.order_items].sort((a, b) => a.sort_order - b.sort_order) };
}

async function markPaid(session: Stripe.Checkout.Session, now: Date): Promise<void> {
  const orderId = session.client_reference_id ?? session.metadata?.order_id;
  const order = orderId ? await loadOrder(orderId) : null;
  if (!order) {
    console.error("[stripe] pago sin pedido", session.id, orderId);
    return;
  }
  const intent = paymentIntentId(session);
  if (!paidAmountMatches(order, session)) {
    // Los renglones salen del total guardado: si no cuadra, algo raro pasó. Se registra; el dinero sí entró.
    console.error("[stripe] el monto pagado no coincide con el pedido", order.id, session.amount_total, order.total_cents);
  }

  const supabase = getServiceSupabase();
  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      on_board: true,
      stripe_payment_intent_id: intent,
      stripe_checkout_session_id: session.id,
      updated_at: now.toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "received")
    .eq("payment_status", "pending")
    .select("*");
  if (error) throw error;

  if (updated.length > 0) {
    revalidatePath("/admin/pedidos");
    if (order.on_board) await notifyOrderPaid(updated[0]);
    else await notifyOrderCreated(updated[0], order.order_items, now);
    return;
  }

  // Pagó un pedido que ya se había cancelado (por él, el personal o el tiempo): se le regresa el dinero.
  if (order.status === "cancelled" && order.payment_status === "pending" && intent) {
    await refundOrder({ id: order.id, stripe_payment_intent_id: intent });
    const { error: refundError } = await supabase
      .from("orders")
      .update({ payment_status: "refunded", stripe_payment_intent_id: intent, updated_at: now.toISOString() })
      .eq("id", order.id);
    if (refundError) throw refundError;
    console.warn("[stripe] pago de un pedido cancelado; se reembolsó", order.id);
  }
  // Si ya estaba pagado, es el mismo aviso repetido: no se hace nada.
}

async function markExpired(session: Stripe.Checkout.Session, now: Date): Promise<void> {
  const orderId = session.client_reference_id ?? session.metadata?.order_id;
  if (!orderId) return;
  // Solo pedidos que nunca salieron en el tablero; con envío manual el cliente puede volver a tocar "Pagar".
  const { error } = await getServiceSupabase()
    .from("orders")
    .update({ status: "cancelled", cancelled_by: "system", updated_at: now.toISOString() })
    .eq("id", orderId)
    .eq("stripe_checkout_session_id", session.id)
    .eq("on_board", false)
    .eq("status", "received")
    .eq("payment_status", "pending");
  if (error) throw error;
}

/** Atiende un aviso de Stripe ya verificado. Lanza si algo falla (Stripe lo reintenta). */
export async function handleStripeEvent(event: Stripe.Event, now = new Date()): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      if (event.data.object.payment_status === "paid") await markPaid(event.data.object, now);
      return;
    case "checkout.session.expired":
      await markExpired(event.data.object, now);
      return;
    default:
      return;
  }
}
