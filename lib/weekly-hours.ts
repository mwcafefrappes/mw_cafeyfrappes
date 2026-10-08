/**
 * Horario de apertura (`business_settings.weekly_hours`, editable en
 * /admin/horario): leerlo sin confiar en lo guardado, escribirlo para el
 * cliente ("Jueves a domingo") y saber si en un momento dado está abierto.
 *
 * México no tiene horario de verano desde 2022: la hora local es UTC−6
 * fija (`America/Mexico_City`), igual que en Axel Style.
 */

import { formatTimeOfDay, type TimeFormat } from "./time-format";

export interface WeeklyHour {
  /** 0 = domingo … 6 = sábado (como `Date#getDay`). */
  day: number;
  /** "HH:MM", hora local. */
  start: string;
  end: string;
}

export const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

/** Orden de la semana para el cliente: lunes primero, domingo al final. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "HH:MM" de 00:00 a 23:59. */
export function isTimeOfDay(value: string): boolean {
  return TIME_RE.test(value);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Descarta entradas mal formadas en vez de romper la página. */
export function parseWeeklyHours(raw: unknown): WeeklyHour[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (entry): entry is WeeklyHour =>
        typeof entry === "object" &&
        entry !== null &&
        Number.isInteger((entry as WeeklyHour).day) &&
        (entry as WeeklyHour).day >= 0 &&
        (entry as WeeklyHour).day <= 6 &&
        TIME_RE.test(String((entry as WeeklyHour).start)) &&
        TIME_RE.test(String((entry as WeeklyHour).end))
    )
    .sort((a, b) => WEEK_ORDER.indexOf(a.day) - WEEK_ORDER.indexOf(b.day));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface HoursLine {
  days: string;
  hours: string;
}

/**
 * Agrupa días consecutivos con el mismo horario:
 * jue–dom 19–23 → [{ days: "Jueves a domingo", hours: "7:00 p. m. – 11:00 p. m." }].
 */
export function summarizeWeeklyHours(hours: WeeklyHour[], format: TimeFormat): HoursLine[] {
  const byDay = new Map(hours.map((h) => [h.day, h]));
  const lines: HoursLine[] = [];
  let run: number[] = [];

  const flush = () => {
    if (run.length === 0) return;
    const first = byDay.get(run[0])!;
    const days =
      run.length === 1
        ? capitalize(DAY_NAMES[run[0]])
        : run.length === 2
          ? `${capitalize(DAY_NAMES[run[0]])} y ${DAY_NAMES[run[1]]}`
          : `${capitalize(DAY_NAMES[run[0]])} a ${DAY_NAMES[run[run.length - 1]]}`;
    lines.push({
      days,
      hours: `${formatTimeOfDay(timeToMinutes(first.start), format)} – ${formatTimeOfDay(timeToMinutes(first.end), format)}`,
    });
    run = [];
  };

  for (const day of WEEK_ORDER) {
    const entry = byDay.get(day);
    if (!entry) {
      flush();
      continue;
    }
    const previous = run.length > 0 ? byDay.get(run[run.length - 1])! : null;
    if (previous && (previous.start !== entry.start || previous.end !== entry.end)) flush();
    run.push(day);
  }
  flush();
  return lines;
}

const MEXICO_OFFSET_MINUTES = -6 * 60;

/** Día de la semana y minutos desde la medianoche en hora de México. */
export function toMexicoLocal(date: Date): { day: number; minutes: number } {
  const local = new Date(date.getTime() + MEXICO_OFFSET_MINUTES * 60_000);
  return { day: local.getUTCDay(), minutes: local.getUTCHours() * 60 + local.getUTCMinutes() };
}

/** ¿Está abierto en este instante? Un cierre después de medianoche ("23:00"–"01:00") cuenta para el día siguiente. */
export function isOpenAt(hours: WeeklyHour[], date: Date): boolean {
  const { day, minutes } = toMexicoLocal(date);
  return hours.some((entry) => {
    const start = timeToMinutes(entry.start);
    const end = timeToMinutes(entry.end);
    if (end > start) return entry.day === day && minutes >= start && minutes < end;
    // Cruza la medianoche.
    return (entry.day === day && minutes >= start) || ((entry.day + 1) % 7 === day && minutes < end);
  });
}
