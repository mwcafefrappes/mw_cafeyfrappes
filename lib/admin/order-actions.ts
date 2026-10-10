"use server";

/**
 * Acciones del tablero /admin/pedidos: avanzar el estado, marcar el pago,
 * poner el envío (domicilio en modo manual) y cancelar. Las reglas están en `lib/orders.ts`; cada cambio es
 * condicional al estado que vio el personal (si otro dispositivo ya lo
 * movió, se avisa en vez de pisarlo).
 */

import { revalidatePath } from "next/cache";
import { notifyOrderCancelled } from "../order-server";
import { parsePesosToCents } from "../money";
import { needsDeliveryFee, ORDER_STATUSES, staffTransitionError, type FullOrderState, type OrderState, type OrderStatus } from "../orders";
import { closeCheckout, refundOrder } from "../stripe-payments";
import { getServiceSupabase } from "../supabase";
import { requireAdminUser } from "./auth";

export type BoardActionResult = { ok: true } | { ok: false; error: string };

const STALE = "Alguien más ya cambió este pedido; se actualizó la lista.";

async function loadOrder(id: string) {
  const { data, error } = await getServiceSupabase().from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function setOrderStatusAction(id: string, to: OrderStatus): Promise<BoardActionResult> {
  await requireAdminUser();
  if (!(ORDER_STATUSES as readonly string[]).includes(to)) return { ok: false, error: "Estado desconocido." };
  const order = await loadOrder(id);
  if (!order) return { ok: false, error: "Ese pedido ya no existe." };
  const problem = staffTransitionError(order as OrderState, to);
  if (problem) return { ok: false, error: problem };

  // Cancelar un pedido pagado con tarjeta: primero se le regresa el dinero (si falla, no se cancela).
  const refund = to === "cancelled" && order.payment_method === "card" && order.payment_status === "paid";
  if (refund) {
    try {
      await refundOrder(order);
    } catch (error) {
      console.error("[stripe] no se pudo reembolsar", order.id, error);
      return { ok: false, error: "No se pudo regresar el dinero de la tarjeta. Intenta otra vez en un momento; el pedido sigue igual." };
    }
  }

  let update = getServiceSupabase()
    .from("orders")
    .update({
      status: to,
      cancelled_by: to === "cancelled" ? "staff" : null,
      ...(refund ? { payment_status: "refunded" } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  // Con el dinero ya regresado, se cancela aunque otro dispositivo lo haya movido mientras tanto.
  if (!refund) update = update.eq("status", order.status).eq("payment_status", order.payment_status);
  const { data, error } = await update.select("id");
  if (error) throw error;
  revalidatePath("/admin/pedidos");
  if (data.length === 0) return { ok: false, error: STALE };
  if (to === "cancelled") {
    if (order.payment_method === "card" && order.payment_status === "pending") await closeCheckout(order);
    await notifyOrderCancelled(order, "staff");
  }
  return { ok: true };
}

/** Efectivo o transferencia: el personal confirma que ya pagó (o lo deshace si se equivocó). */
export async function setPaymentStatusAction(id: string, paid: boolean): Promise<BoardActionResult> {
  await requireAdminUser();
  const order = await loadOrder(id);
  if (!order) return { ok: false, error: "Ese pedido ya no existe." };
  if (order.payment_method === "card") return { ok: false, error: "Los pagos con tarjeta se confirman solos." };
  if (order.status === "cancelled") return { ok: false, error: "Ese pedido está cancelado." };
  // Deshacer "pagado" solo mientras no se haya empezado a preparar una transferencia (si no, quedaría preparando sin pago).
  if (!paid && order.payment_method === "transfer" && order.status !== "received") {
    return { ok: false, error: "Ese pedido ya se está preparando; el pago ya no se puede desmarcar." };
  }

  const { data, error } = await getServiceSupabase()
    .from("orders")
    .update({ payment_status: paid ? "paid" : "pending", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("payment_status", paid ? "pending" : "paid")
    .select("id");
  if (error) throw error;
  revalidatePath("/admin/pedidos");
  return data.length === 0 ? { ok: false, error: STALE } : { ok: true };
}

/** Máximo que se puede poner de envío desde el tablero (para atrapar un cero de más). */
const MAX_DELIVERY_FEE_CENTS = 100_000;

/** Envío manual: la tienda pone el costo y el cliente ya puede pagar en /pedido/<token>. */
export async function setDeliveryFeeAction(id: string, pesos: string): Promise<BoardActionResult> {
  await requireAdminUser();
  const fee = parsePesosToCents(pesos.trim());
  if (fee === null) return { ok: false, error: "Escribe el costo del envío en pesos, por ejemplo 40." };
  if (fee > MAX_DELIVERY_FEE_CENTS) return { ok: false, error: "Ese envío se ve muy alto; revísalo." };
  const order = await loadOrder(id);
  if (!order) return { ok: false, error: "Ese pedido ya no existe." };
  if (!needsDeliveryFee(order as FullOrderState)) return { ok: false, error: "Este pedido ya tiene envío." };

  const { data, error } = await getServiceSupabase()
    .from("orders")
    .update({ delivery_fee_cents: fee, total_cents: order.subtotal_cents + fee, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "received")
    .is("delivery_fee_cents", null)
    .select("id");
  if (error) throw error;
  revalidatePath("/admin/pedidos");
  return data.length === 0 ? { ok: false, error: STALE } : { ok: true };
}
