/**
 * Horarios para pedidos programados (CLAUDE.md 5.2): solo en días y horas
 * de apertura, cada `slotMinutes`, con `leadMinutes` de anticipación,
 * hasta `maxDaysAhead` días y máximo `maxPerSlot` pedidos por horario.
 * Puro: lo usan el carrito (para mostrar las horas) y el servidor (para
 * validar la que llega).
 *
 * Hora de México fija (UTC−6, sin horario de verano desde 2022).
 */

import { timeToMinutes, type WeeklyHour } from "./weekly-hours";

const MEXICO_OFFSET_MINUTES = 6 * 60;
const DAY_MS = 86_400_000;

export interface SlotSettings {
  leadMinutes: number;
  slotMinutes: number;
  maxPerSlot: number;
  /** 0 = solo hoy. */
  maxDaysAhead: number;
}

export interface ScheduleSlot {
  /** Instante en UTC (ISO, sin milisegundos), lo que se guarda en `orders.scheduled_for`. */
  startIso: string;
  /** Minutos desde la medianoche del día de apertura (pueden pasar de 1440 si cierra después de medianoche). */
  minutes: number;
  full: boolean;
}

export interface ScheduleDay {
  /** Día de apertura, "YYYY-MM-DD" en hora de México. */
  day: string;
  /** 0 = hoy, 1 = mañana… */
  daysAhead: number;
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
  slots: ScheduleSlot[];
}

/** "YYYY-MM-DD" de hoy en México. */
export function mexicoDay(date: Date): string {
  return new Date(date.getTime() - MEXICO_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

function dayStartUtcMs(day: string): number {
  return new Date(`${day}T00:00:00Z`).getTime() + MEXICO_OFFSET_MINUTES * 60_000;
}

export function slotIso(day: string, minutes: number): string {
  return new Date(dayStartUtcMs(day) + minutes * 60_000).toISOString().replace(".000Z", "Z");
}

/** Normaliza un ISO que llega del navegador para compararlo con los de `slotIso`. */
export function normalizeIso(value: string): string | null {
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString().replace(".000Z", "Z");
}

/**
 * Días con horarios disponibles a partir de `now`. `taken` = pedidos ya
 * programados por horario (clave: `startIso`). Incluye los horarios llenos
 * (`full`) para mostrarlos deshabilitados; omite los días sin horarios.
 */
export function scheduleDays(hours: WeeklyHour[], settings: SlotSettings, now: Date, taken: Map<string, number>): ScheduleDay[] {
  const today = mexicoDay(now);
  const earliest = now.getTime() + settings.leadMinutes * 60_000;
  const result: ScheduleDay[] = [];

  // Desde ayer: un horario que cruza la medianoche puede seguir abierto hoy.
  for (let offset = -1; offset <= settings.maxDaysAhead; offset++) {
    const day = new Date(new Date(`${today}T00:00:00Z`).getTime() + offset * DAY_MS).toISOString().slice(0, 10);
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    const slots: ScheduleSlot[] = [];
    for (const entry of hours.filter((h) => h.day === weekday)) {
      const start = timeToMinutes(entry.start);
      let end = timeToMinutes(entry.end);
      if (end <= start) end += 24 * 60;
      for (let minutes = start; minutes < end; minutes += settings.slotMinutes) {
        const startMs = dayStartUtcMs(day) + minutes * 60_000;
        if (startMs < earliest) continue;
        const startIso = slotIso(day, minutes);
        slots.push({ startIso, minutes, full: (taken.get(startIso) ?? 0) >= settings.maxPerSlot });
      }
    }
    if (slots.length === 0) continue;
    slots.sort((a, b) => a.minutes - b.minutes);
    result.push({ day, daysAhead: Math.max(0, offset), weekday, slots });
  }
  return result;
}

/** El horario elegido existe, está dentro de las reglas y tiene lugar. */
export function isSlotAvailable(days: ScheduleDay[], iso: string): boolean {
  return days.some((day) => day.slots.some((slot) => slot.startIso === iso && !slot.full));
}
