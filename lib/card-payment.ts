/**
 * Reglas puras del cobro con tarjeta (Stripe Checkout, Fase 6). Sin SDK ni
 * BD: lo usan `lib/stripe-payments.ts`, el webhook y las pruebas.
 */

import { UNPAID_CARD_MINUTES } from "./orders";

/** Stripe pide que la página de pago dure entre 30 min y 24 h. Un minuto de margen. */
const STRIPE_MIN_SESSION_MINUTES = 31;

/**
 * Hasta cuándo puede pagarse. Un pedido fuera del tablero tiene
 * `UNPAID_CARD_MINUTES` desde que se hizo; si el cliente abre la página de
 * pago al final de ese plazo, se alarga lo mínimo que pide Stripe. Con
 * envío manual (ya en el tablero) el plazo empieza al tocar "Pagar".
 */
export function paymentDeadline(order: { created_at: string; on_board: boolean }, now: Date): Date {
  const minimum = now.getTime() + STRIPE_MIN_SESSION_MINUTES * 60_000;
  const base = order.on_board ? now.getTime() : Date.parse(order.created_at);
  return new Date(Math.max(minimum, base + UNPAID_CARD_MINUTES * 60_000));
}

export interface CheckoutLine {
  name: string;
  description: string | null;
  unitCents: number;
  quantity: number;
}

interface ItemForCheckout {
  product_name: string;
  size_name: string | null;
  extras: unknown;
  unit_cents: number;
  quantity: number;
  note: string | null;
}

/**
 * Renglones que ve el cliente en la página de pago de Stripe. Siempre
 * suman el total guardado; si por algo no cuadra, se cobra un solo
 * renglón "Pedido #N" por el total (lo que manda es el total del servidor).
 */
export function checkoutLines(order: { number: number; total_cents: number; delivery_fee_cents: number | null }, items: ItemForCheckout[]): CheckoutLine[] {
  const lines: CheckoutLine[] = items.map((item) => {
    const extras = Array.isArray(item.extras) ? (item.extras as { name?: unknown }[]).map((e) => String(e.name ?? "")).filter(Boolean) : [];
    const description = [extras.length > 0 ? `+ ${extras.join(", ")}` : null, item.note ? `“${item.note}”` : null].filter(Boolean).join(" · ");
    return {
      name: item.size_name ? `${item.product_name} (${item.size_name})` : item.product_name,
      description: description || null,
      unitCents: item.unit_cents,
      quantity: item.quantity,
    };
  });
  if (order.delivery_fee_cents) lines.push({ name: "Envío a domicilio", description: null, unitCents: order.delivery_fee_cents, quantity: 1 });

  const sum = lines.reduce((total, line) => total + line.unitCents * line.quantity, 0);
  if (sum !== order.total_cents || lines.some((line) => line.unitCents <= 0)) {
    return [{ name: `Pedido #${order.number}`, description: null, unitCents: order.total_cents, quantity: 1 }];
  }
  return lines;
}

/** Lo que confirmó Stripe coincide con el pedido (monto y moneda). */
export function paidAmountMatches(order: { total_cents: number }, session: { amount_total: number | null; currency: string | null }): boolean {
  return session.amount_total === order.total_cents && session.currency === "mxn";
}
