-- Cobro con tarjeta (Fase 6, CLAUDE.md 5.3): Stripe Checkout.
--
-- - El pedido se marca pagado SOLO con el webhook de Stripe
--   (`checkout.session.completed`), nunca con el regreso del navegador.
-- - Un pedido con tarjeta sin pagar se cancela solo; `pay_by` alarga ese
--   plazo mientras la página de pago de Stripe siga abierta (Stripe pide
--   que dure al menos 30 minutos), para no cancelar a alguien que está
--   pagando.

alter table orders
  add column stripe_checkout_session_id text unique,
  add column stripe_payment_intent_id text,
  add column pay_by timestamptz;

comment on column orders.pay_by is 'Hasta cuándo puede pagarse con tarjeta (vence la página de pago de Stripe). Después, si no está en el tablero, se cancela solo.';
