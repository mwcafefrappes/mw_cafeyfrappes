/**
 * Textos de un pedido para el cliente, el panel y el correo del negocio.
 * Puro; hora de México (UTC−6 fijo).
 */

import { formatMXN } from "./money";
import { mexicoDay } from "./order-slots";
import { atTimeEs, formatTimeOfDay, type TimeFormat } from "./time-format";
import { DAY_NAMES } from "./weekly-hours";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function daysBetween(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / 86_400_000);
}

/** "Hoy", "Mañana" o "Viernes 10 oct" para un día "YYYY-MM-DD". */
export function dayLabel(day: string, today: string): string {
  const diff = daysBetween(today, day);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  const date = new Date(`${day}T00:00:00Z`);
  return `${capitalize(DAY_NAMES[date.getUTCDay()])} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** Minutos desde la medianoche (México) de un instante. */
export function mexicoMinutes(iso: string): number {
  const local = new Date(Date.parse(iso) - 6 * 60 * 60_000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

/** "hoy a las 7:30 p. m." / "mañana a las…" / "el viernes 10 oct a las…". */
export function scheduledLabel(iso: string, format: TimeFormat, now: Date): string {
  const day = mexicoDay(new Date(iso));
  const label = dayLabel(day, mexicoDay(now));
  const when = label === "Hoy" || label === "Mañana" ? label.toLowerCase() : `el ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
  return `${when} ${atTimeEs(formatTimeOfDay(mexicoMinutes(iso), format))}`;
}

export interface OrderTypeInfo {
  type: string;
  table_number: number | null;
}

export function orderTypeLabel(order: OrderTypeInfo): string {
  if (order.type === "table") return `Mesa ${order.table_number}`;
  if (order.type === "delivery") return "A domicilio";
  return "Para recoger";
}

export interface OrderLineText {
  product_name: string;
  size_name: string | null;
  extras: { name: string }[];
  quantity: number;
  line_cents: number;
  note: string | null;
}

/** "2 × Frappé moka (16 oz) + Crema batida, Shot extra — $240.00 · Nota: poco hielo" */
export function orderLineText(line: OrderLineText): string {
  const size = line.size_name ? ` (${line.size_name})` : "";
  const extras = line.extras.length > 0 ? ` + ${line.extras.map((e) => e.name).join(", ")}` : "";
  const note = line.note ? ` · Nota: ${line.note}` : "";
  return `${line.quantity} × ${line.product_name}${size}${extras} — ${formatMXN(line.line_cents)}${note}`;
}

/** "+52 958 123 4567" para mostrar; `wa.me` usa el número tal cual. */
export function phoneLabel(phone: string | null): string | null {
  if (!phone) return null;
  const local = phone.replace(/^52/, "");
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
