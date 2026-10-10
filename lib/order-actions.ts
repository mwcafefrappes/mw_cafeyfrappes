"use server";

/**
 * Acciones del cliente (sin cuenta): crear el pedido desde el carrito,
 * pagarlo con tarjeta (Stripe), cancelarlo y subir el comprobante de
 * transferencia desde /pedido/<token>. El token es el único "login" (igual que /cita/<token>
 * de Axel Style).
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSiteUrl } from "./config/business";
import { canCustomerCancel, canPayOnline, canUploadProof, orderRulesError, orderTotals, parseOrderRequest, priceOrder, type FullOrderState, type OrderState } from "./orders";
import { getOrderByToken, getPricingProducts, insertOrder, loadOrderConfig, notifyOrderCancelled, notifyOrderCreated, pricedLinesToItems, type OrderWithItems } from "./order-server";
import { getPublicBusinessSettings } from "./public-data";
import { closeCheckout, openCheckout, type CheckoutResult } from "./stripe-payments";
import { PAYMENT_PROOFS_BUCKET } from "./storage";
import { getServiceSupabase } from "./supabase";

const MAX_PROOF_BYTES = 4 * 1024 * 1024;
const PROOF_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export type PlaceOrderResult = { ok: true; token: string; number: number; checkoutUrl: string | null } | { ok: false; error: string };

/** De dónde regresa el cliente después de pagar: el mismo sitio en que está (producción, preview o local). */
async function siteOrigin(): Promise<string> {
  const origin = (await headers()).get("origin");
  if (origin && /^https?:\/\/[^/]+$/.test(origin)) return origin;
  return getSiteUrl(await getPublicBusinessSettings()).replace(/\/+$/, "");
}

/** Página de pago de Stripe; `null` si no se pudo abrir (el cliente lo reintenta con "Pagar"). */
async function tryCheckout(order: OrderWithItems, now: Date): Promise<CheckoutResult | null> {
  try {
    return await openCheckout(order, await siteOrigin(), now);
  } catch (error) {
    console.error("[stripe] no se pudo abrir la página de pago", order.id, error);
    return null;
  }
}

/** El navegador manda el carrito y los datos; el servidor valida todo y recalcula el total. */
export async function placeOrderAction(payload: unknown): Promise<PlaceOrderResult> {
  const parsed = parseOrderRequest(payload);
  if (!parsed.ok) return parsed;
  const request = parsed.value;

  const now = new Date();
  const [{ config }, products] = await Promise.all([loadOrderConfig(now), getPricingProducts()]);
  const ruleError = orderRulesError(request, config.rules);
  if (ruleError) return { ok: false, error: ruleError };

  const priced = priceOrder(request.items, products);
  if (!priced.ok) return priced;
  const totals = orderTotals(request.type, priced.value.subtotalCents, config.rules);
  if (!totals.ok) return totals;

  try {
    const order = await insertOrder(request, priced.value.lines, { subtotalCents: priced.value.subtotalCents, ...totals.value }, config.rules.delivery.store, now);
    // Con tarjeta se avisa al negocio cuando se paga (Stripe), no antes.
    if (order.on_board) await notifyOrderCreated(order, pricedLinesToItems(priced.value.lines), now);
    revalidatePath("/admin/pedidos");
    // Con tarjeta y el total ya definido, el cliente va directo a pagar.
    const saved = canPayOnline(order as FullOrderState) ? await getOrderByToken(order.token) : null;
    const checkout = saved ? await tryCheckout(saved, now) : null;
    const checkoutUrl = checkout?.kind === "redirect" ? checkout.url : null;
    return { ok: true, token: order.token, number: order.number, checkoutUrl };
  } catch (error) {
    console.error("[pedidos] no se pudo crear el pedido", error);
    return { ok: false, error: "No pudimos guardar tu pedido. Intenta otra vez en un momento." };
  }
}

function backToOrder(token: string, key: "saved" | "error", message: string): never {
  redirect(`/pedido/${token}?${key}=${encodeURIComponent(message)}`);
}

export async function cancelOrderAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const order = await getOrderByToken(token);
  if (!order) redirect("/menu");
  if (!canCustomerCancel(order as OrderState)) {
    backToOrder(token, "error", "Tu pedido ya se está preparando; para cancelarlo escríbenos por WhatsApp.");
  }
  // Solo si sigue "recibido" en este instante (el personal pudo moverlo mientras tanto).
  const { data, error } = await getServiceSupabase()
    .from("orders")
    .update({ status: "cancelled", cancelled_by: "customer", updated_at: new Date().toISOString() })
    .eq("id", order.id)
    .eq("status", "received")
    .select("id");
  if (error) throw error;
  if (data.length === 0) backToOrder(token, "error", "Tu pedido ya se está preparando; para cancelarlo escríbenos por WhatsApp.");
  await closeCheckout(order);
  await notifyOrderCancelled(order, "customer");
  revalidatePath("/admin/pedidos");
  backToOrder(token, "saved", "Cancelamos tu pedido.");
}

/** "Pagar" en /pedido/<token>: abre (o retoma) la página de pago de Stripe. */
export async function startCardPaymentAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const order = await getOrderByToken(token);
  if (!order) redirect("/menu");
  if (!canPayOnline(order as FullOrderState)) backToOrder(token, "error", "Este pedido ya no se puede pagar en línea.");
  const checkout = await tryCheckout(order, new Date());
  if (!checkout) backToOrder(token, "error", "No pudimos abrir la página de pago. Intenta otra vez en un momento.");
  if (checkout.kind === "already_paid") backToOrder(token, "saved", "Ya recibimos tu pago; en un momento se actualiza tu pedido.");
  redirect(checkout.url);
}

export async function uploadPaymentProofAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const order = await getOrderByToken(token);
  if (!order) redirect("/menu");
  if (!canUploadProof(order as OrderState)) backToOrder(token, "error", "Este pedido ya no necesita comprobante.");

  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) backToOrder(token, "error", "Elige la captura o el PDF de tu transferencia.");
  const extension = PROOF_TYPES[file.type];
  if (!extension) backToOrder(token, "error", "El comprobante debe ser una imagen (JPG, PNG) o un PDF.");
  if (file.size > MAX_PROOF_BYTES) backToOrder(token, "error", "El archivo pesa demasiado (máximo 4 MB).");

  const supabase = getServiceSupabase();
  const path = `${order.id}/${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(PAYMENT_PROOFS_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from("orders").update({ payment_proof_path: path, updated_at: new Date().toISOString() }).eq("id", order.id);
  if (error) throw error;
  if (order.payment_proof_path) await supabase.storage.from(PAYMENT_PROOFS_BUCKET).remove([order.payment_proof_path]);
  revalidatePath("/admin/pedidos");
  backToOrder(token, "saved", "Recibimos tu comprobante. En cuanto confirmemos el pago empezamos a preparar tu pedido.");
}
