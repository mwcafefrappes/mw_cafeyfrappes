/**
 * Cómo se escribe una hora para el cliente (`business_settings.time_format`,
 * se elige en `/admin/horario`): horario de la landing, aviso de "Abrimos…"
 * y, en la Fase 5, las horas de los pedidos programados.
 */

export const TIME_FORMATS = ["24h", "12h", "words", "words_upper"] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

export const TIME_FORMAT_LABELS: Record<TimeFormat, string> = {
  "24h": "13:00",
  "12h": "1:00 p. m.",
  words: "1 de la tarde",
  words_upper: "1 DE LA TARDE",
};

export function isTimeFormat(value: string): value is TimeFormat {
  return (TIME_FORMATS as readonly string[]).includes(value);
}

/** El valor guardado en `business_settings`; si algo raro quedó ahí, "1 de la tarde". */
export function parseTimeFormat(value: string | null | undefined): TimeFormat {
  return value && isTimeFormat(value) ? value : "words";
}

function periodOfDay(hour24: number): string {
  if (hour24 === 12) return "del día";
  if (hour24 < 6) return "de la madrugada";
  if (hour24 < 12) return "de la mañana";
  if (hour24 < 20) return "de la tarde";
  return "de la noche";
}

/** `minutes` = minutos desde la medianoche local. */
export function formatTimeOfDay(minutes: number, format: TimeFormat): string {
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const minutePart = String(minute).padStart(2, "0");

  if (format === "24h") return `${String(hour24).padStart(2, "0")}:${minutePart}`;

  const hour12 = hour24 % 12 || 12;

  if (format === "12h") return `${hour12}:${minutePart} ${hour24 < 12 ? "a. m." : "p. m."}`;

  const clock = minute === 0 ? String(hour12) : `${hour12}:${minutePart}`;
  const words = `${clock} ${hour24 === 0 ? "de la noche" : periodOfDay(hour24)}`;
  return format === "words_upper" ? words.toUpperCase() : words;
}

/** "a la" para la una, "a las" para todas las demás horas. */
export function timeLeadIn(label: string): "a la" | "a las" {
  return /^1(?::\d{2})?(?!\d)/.test(label) ? "a la" : "a las";
}

/** "a la 1 de la tarde" / "a las 3 de la tarde" / "a las 13:00". */
export function atTimeEs(label: string): string {
  return `${timeLeadIn(label)} ${label}`;
}
