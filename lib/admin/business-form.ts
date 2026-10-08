/**
 * Validación de /admin/negocio por sección (cada tarjeta del panel se
 * guarda por separado). Puro: lo usan `business-actions.ts` y las pruebas.
 * Regresa las columnas de `business_settings` listas para `update`.
 */

import type { Json, TablesUpdate } from "../database.types";
import { parsePesosToCents } from "../money";
import { ALLOWED_METHODS, PAYMENT_METHODS, type OrderType, type PaymentMatrix, type PaymentMethod } from "../payment-methods";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "../seo";
import { isTimeFormat } from "../time-format";
import { DAY_NAMES, isTimeOfDay, type WeeklyHour } from "../weekly-hours";
import type { FormLike, FormResult } from "./menu-form";

type SettingsUpdate = TablesUpdate<"business_settings">;

function text(form: FormLike, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function on(form: FormLike, name: string): boolean {
  return form.get(name) === "on";
}

/**
 * WhatsApp para `wa.me`: 52 + 10 dígitos. Acepta "958 186 1260",
 * "+52 958…", "521958…" (formato viejo de celular). `null` si no es un
 * número mexicano de 10 dígitos.
 */
export function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return digits;
  if (digits.length === 13 && digits.startsWith("521")) return `52${digits.slice(3)}`;
  return null;
}

/** CLABE de 18 dígitos con su dígito verificador (pesos 3, 7, 1). */
export function isValidClabe(clabe: string): boolean {
  if (!/^\d{18}$/.test(clabe)) return false;
  const weights = [3, 7, 1];
  const sum = [...clabe.slice(0, 17)].reduce((acc, digit, i) => acc + ((Number(digit) * weights[i % 3]) % 10), 0);
  return (10 - (sum % 10)) % 10 === Number(clabe[17]);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function optionalUrl(form: FormLike, name: string, label: string): FormResult<string | null> {
  const value = text(form, name);
  if (!value) return { ok: true, value: null };
  if (!isHttpUrl(value)) return { ok: false, error: `${label}: pega el enlace completo, empezando con https://` };
  return { ok: true, value };
}

export function parseContactSection(form: FormLike): FormResult<SettingsUpdate> {
  const whatsappRaw = text(form, "business_whatsapp");
  const whatsapp = whatsappRaw ? normalizeWhatsapp(whatsappRaw) : null;
  if (whatsappRaw && !whatsapp) return { ok: false, error: "El WhatsApp debe ser un número de 10 dígitos (ej. 958 186 1260)." };

  const email = text(form, "business_email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Revisa el correo." };

  const instagram = optionalUrl(form, "social_instagram_url", "Instagram");
  if (!instagram.ok) return instagram;
  const facebook = optionalUrl(form, "social_facebook_url", "Facebook");
  if (!facebook.ok) return facebook;
  const parentInstagram = optionalUrl(form, "parent_store_instagram_url", "Instagram de la tienda principal");
  if (!parentInstagram.ok) return parentInstagram;

  const parentName = text(form, "parent_store_name");
  if (!parentName) return { ok: false, error: "Escribe el nombre de la tienda principal." };

  return {
    ok: true,
    value: {
      business_whatsapp: whatsapp,
      business_email: email || null,
      social_instagram_url: instagram.value,
      social_facebook_url: facebook.value,
      parent_store_name: parentName,
      parent_store_instagram_url: parentInstagram.value,
    },
  };
}

export function parseLocationSection(form: FormLike): FormResult<SettingsUpdate> {
  const address = text(form, "business_address");
  const latRaw = text(form, "business_lat");
  const lngRaw = text(form, "business_lng");
  if (Boolean(latRaw) !== Boolean(lngRaw)) return { ok: false, error: "Escribe latitud y longitud juntas (o deja las dos vacías)." };
  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;
  if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) return { ok: false, error: "La latitud no es válida." };
  if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) return { ok: false, error: "La longitud no es válida." };
  const maps = optionalUrl(form, "maps_url", "Enlace de Google Maps");
  if (!maps.ok) return maps;
  return { ok: true, value: { business_address: address || null, business_lat: lat, business_lng: lng, maps_url: maps.value } };
}

export function parseOrdersSection(form: FormLike, stripeReady: boolean): FormResult<SettingsUpdate> {
  const deliveryEnabled = on(form, "order_delivery_enabled");
  if (deliveryEnabled && !stripeReady) {
    return {
      ok: false,
      error: "El domicilio se paga con tarjeta en línea; se podrá activar en cuanto el cobro con tarjeta esté listo.",
    };
  }
  const minSubtotal = parsePesosToCents(text(form, "delivery_min_subtotal") || "0");
  if (minSubtotal === null) return { ok: false, error: "Revisa el pedido mínimo para domicilio." };
  const fee = parsePesosToCents(text(form, "delivery_fee") || "0");
  if (fee === null) return { ok: false, error: "Revisa el costo de envío." };
  const mode = text(form, "delivery_fee_mode");
  if (mode !== "auto" && mode !== "manual") return { ok: false, error: "Elige cómo se cobra el envío." };

  return {
    ok: true,
    value: {
      order_pickup_enabled: on(form, "order_pickup_enabled"),
      order_table_enabled: on(form, "order_table_enabled"),
      order_delivery_enabled: deliveryEnabled,
      delivery_min_subtotal_cents: minSubtotal,
      delivery_fee_cents: fee,
      delivery_fee_mode: mode,
    },
  };
}

/** `pay_pickup` / `pay_table` son listas de checkboxes; domicilio siempre es solo tarjeta. */
export function parsePaymentsSection(form: FormLike, stripeReady: boolean): FormResult<SettingsUpdate> {
  const matrix = {} as PaymentMatrix;
  for (const type of ["pickup", "table"] as const satisfies OrderType[]) {
    const chosen = form.getAll(`pay_${type}`).map(String);
    const methods = PAYMENT_METHODS.filter((m): m is PaymentMethod => chosen.includes(m) && ALLOWED_METHODS[type].includes(m));
    if (methods.includes("card") && !stripeReady) {
      return { ok: false, error: "El pago con tarjeta en línea todavía no está disponible." };
    }
    if (methods.length === 0) {
      return { ok: false, error: `Deja al menos un método de pago para "${type === "pickup" ? "recoger" : "mesa"}".` };
    }
    matrix[type] = methods;
  }
  matrix.delivery = ["card"];

  const clabe = text(form, "transfer_clabe").replace(/\s/g, "");
  if (clabe && !isValidClabe(clabe)) return { ok: false, error: "La CLABE no es válida (deben ser 18 dígitos; revisa que esté bien copiada)." };

  return {
    ok: true,
    value: {
      payment_methods: matrix,
      transfer_bank: text(form, "transfer_bank") || null,
      transfer_clabe: clabe || null,
      transfer_holder: text(form, "transfer_holder") || null,
    },
  };
}

export const SLOT_MINUTE_OPTIONS = [10, 15, 20, 30, 45, 60] as const;
export const MAX_LEAD_MINUTES = 24 * 60;
export const MAX_DAYS_AHEAD = 60;

function intInRange(raw: string, min: number, max: number): number | null {
  if (!/^\d{1,4}$/.test(raw)) return null;
  const value = Number(raw);
  return value >= min && value <= max ? value : null;
}

export function parseScheduledSection(form: FormLike): FormResult<SettingsUpdate> {
  const lead = intInRange(text(form, "scheduled_min_lead_minutes"), 0, MAX_LEAD_MINUTES);
  if (lead === null) return { ok: false, error: "La anticipación debe estar entre 0 minutos y 24 horas." };
  const slot = Number(text(form, "scheduled_slot_minutes"));
  if (!(SLOT_MINUTE_OPTIONS as readonly number[]).includes(slot)) return { ok: false, error: "Elige cada cuántos minutos se puede escoger hora." };
  const perSlot = intInRange(text(form, "scheduled_max_per_slot"), 1, 99);
  if (perSlot === null) return { ok: false, error: "El máximo de pedidos por horario debe ser de 1 a 99." };
  const daysAhead = intInRange(text(form, "scheduled_max_days_ahead"), 0, MAX_DAYS_AHEAD);
  if (daysAhead === null) return { ok: false, error: `Los días adelante deben ser de 0 a ${MAX_DAYS_AHEAD}.` };
  return {
    ok: true,
    value: {
      scheduled_orders_enabled: on(form, "scheduled_orders_enabled"),
      scheduled_min_lead_minutes: lead,
      scheduled_slot_minutes: slot,
      scheduled_max_per_slot: perSlot,
      scheduled_max_days_ahead: daysAhead,
    },
  };
}

export function parseSiteSection(form: FormLike): FormResult<SettingsUpdate> {
  const siteUrl = optionalUrl(form, "site_url", "Dirección del sitio");
  if (!siteUrl.ok) return siteUrl;
  const seoTitle = text(form, "seo_title");
  if (seoTitle.length > SEO_TITLE_MAX) return { ok: false, error: `El título para Google puede tener máximo ${SEO_TITLE_MAX} letras.` };
  const seoDescription = text(form, "seo_description");
  if (seoDescription.length > SEO_DESCRIPTION_MAX)
    return { ok: false, error: `La descripción para Google puede tener máximo ${SEO_DESCRIPTION_MAX} letras.` };
  return {
    ok: true,
    value: {
      site_url: siteUrl.value ? siteUrl.value.replace(/\/+$/, "") : null,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
    },
  };
}

/** El `<input type="time">` puede mandar "19:00" o "19:00:00". */
function timeField(form: FormLike, name: string): string | null {
  const value = text(form, name).slice(0, 5);
  return isTimeOfDay(value) ? value : null;
}

/**
 * /admin/horario: `open_N`, `start_N`, `end_N` por día (0 = domingo). Si
 * cierra antes de abrir (p. ej. 19:00 a 01:00) se entiende que cierra
 * después de medianoche. Todos cerrados se permite (vacaciones).
 */
export function parseHoursSection(form: FormLike): FormResult<SettingsUpdate> {
  const hours: WeeklyHour[] = [];
  for (let day = 0; day < 7; day++) {
    if (!on(form, `open_${day}`)) continue;
    const start = timeField(form, `start_${day}`);
    const end = timeField(form, `end_${day}`);
    if (!start || !end) return { ok: false, error: `Revisa las horas del ${DAY_NAMES[day]}.` };
    if (start === end) return { ok: false, error: `El ${DAY_NAMES[day]} abre y cierra a la misma hora.` };
    hours.push({ day, start, end });
  }
  return { ok: true, value: { weekly_hours: hours as unknown as NonNullable<Json> } };
}

export function parseTimeFormatSection(form: FormLike): FormResult<SettingsUpdate> {
  const format = text(form, "time_format");
  if (!isTimeFormat(format)) return { ok: false, error: "Elige cómo se escribe la hora." };
  return { ok: true, value: { time_format: format } };
}
