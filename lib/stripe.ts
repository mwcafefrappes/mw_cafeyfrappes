/**
 * Cliente de Stripe (solo servidor). La llave vive en `STRIPE_SECRET_KEY`
 * (Vercel y `.env.local`); sin ella, la tarjeta y el domicilio no se
 * pueden activar (`env.stripeReady`).
 */

import Stripe from "stripe";
import { env } from "./config/business";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  client ??= new Stripe(env.stripeSecretKey, { appInfo: { name: "MW Cafe y Frappes" } });
  return client;
}
