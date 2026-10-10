/**
 * Junta los ajustes del negocio (`business_settings`) en lo que necesita
 * un pedido: tipos activos, métodos de pago, horarios programables y si
 * está abierto. Puro: lo usan el carrito (para mostrar opciones) y el
 * servidor (para validar), con el mismo resultado en los dos lados.
 */

import { scheduleDays, isSlotAvailable, type ScheduleDay } from "./order-slots";
import type { OrderKind, OrderRules } from "./orders";
import { effectiveMethods, ORDER_TYPES, parsePaymentMatrix, type PaymentMethod } from "./payment-methods";
import { isOpenAt, parseWeeklyHours } from "./weekly-hours";

export interface OrderSettingsInput {
  weekly_hours: unknown;
  order_pickup_enabled: boolean;
  order_table_enabled: boolean;
  order_delivery_enabled: boolean;
  delivery_min_subtotal_cents: number;
  delivery_fee_cents: number;
  delivery_fee_mode: string;
  delivery_radius_m: number;
  business_lat: number | null;
  business_lng: number | null;
  scheduled_orders_enabled: boolean;
  scheduled_min_lead_minutes: number;
  scheduled_slot_minutes: number;
  scheduled_max_per_slot: number;
  scheduled_max_days_ahead: number;
  table_count: number;
  payment_methods: unknown;
}

export interface OrderConfig {
  rules: OrderRules;
  /** Horarios para programar (vacío si programar está apagado). */
  days: ScheduleDay[];
}

export function buildOrderConfig(settings: OrderSettingsInput, now: Date, taken: Map<string, number>, stripeReady: boolean): OrderConfig {
  const hours = parseWeeklyHours(settings.weekly_hours);
  const matrix = parsePaymentMatrix(settings.payment_methods);
  const days = settings.scheduled_orders_enabled
    ? scheduleDays(
        hours,
        {
          leadMinutes: settings.scheduled_min_lead_minutes,
          slotMinutes: settings.scheduled_slot_minutes,
          maxPerSlot: settings.scheduled_max_per_slot,
          maxDaysAhead: settings.scheduled_max_days_ahead,
        },
        now,
        taken
      )
    : [];
  const methods = Object.fromEntries(
    ORDER_TYPES.map((type) => [type, effectiveMethods(matrix, type, stripeReady)])
  ) as Record<OrderKind, PaymentMethod[]>;

  return {
    days,
    rules: {
      pickupEnabled: settings.order_pickup_enabled,
      tableEnabled: settings.order_table_enabled,
      // Domicilio se paga solo con tarjeta: sin Stripe no se ofrece aunque esté activado.
      deliveryEnabled: settings.order_delivery_enabled && methods.delivery.length > 0,
      delivery: {
        minSubtotalCents: settings.delivery_min_subtotal_cents,
        feeCents: settings.delivery_fee_cents,
        feeMode: settings.delivery_fee_mode === "manual" ? "manual" : "auto",
        radiusM: settings.delivery_radius_m,
        store: settings.business_lat !== null && settings.business_lng !== null ? { lat: settings.business_lat, lng: settings.business_lng } : null,
      },
      scheduledEnabled: settings.scheduled_orders_enabled,
      tableCount: settings.table_count,
      methods,
      openNow: isOpenAt(hours, now),
      slotAvailable: (iso) => isSlotAvailable(days, iso),
    },
  };
}
