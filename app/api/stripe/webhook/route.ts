/**
 * Avisos de Stripe (Fase 6). Única forma de marcar un pedido como pagado
 * con tarjeta (CLAUDE.md 5.3). Se verifica la firma con
 * `STRIPE_WEBHOOK_SECRET`; si algo falla se responde 500 y Stripe reintenta.
 *
 * Eventos que se usan: checkout.session.completed,
 * checkout.session.async_payment_succeeded y checkout.session.expired.
 */

import { env } from "@/lib/config/business";
import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/stripe-payments";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Falta la firma", { status: 400 });

  // El cuerpo tal cual llegó: la firma se calcula sobre el texto exacto.
  const body = await request.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, env.stripeWebhookSecret);
  } catch (error) {
    console.error("[stripe] firma inválida", error);
    return new Response("Firma inválida", { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error("[stripe] no se pudo atender el aviso", event.type, event.id, error);
    return new Response("Error", { status: 500 });
  }
  return Response.json({ received: true });
}
