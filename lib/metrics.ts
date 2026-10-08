/**
 * Métricas propias (`metric_counts`, una fila por día + métrica + clave).
 * Puro: lo usan `/api/metrics`, `/admin/metricas` y las pruebas.
 * Sin datos de personas: solo cuántas veces pasó algo cada día.
 */

import { MAX_TABLE_NUMBER } from "./menu";

export const METRICS = ["menu_view", "product_view", "link_click"] as const;
export type Metric = (typeof METRICS)[number];

export const LINK_KEYS = ["whatsapp", "instagram", "facebook", "maps"] as const;
export type LinkKey = (typeof LINK_KEYS)[number];

export const LINK_LABELS: Record<LinkKey, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  maps: "Cómo llegar (mapas)",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida lo que manda el navegador. Regresa la clave normalizada o `null`
 * si no es válida (así nadie llena la tabla con claves inventadas).
 */
export function normalizeMetricKey(metric: unknown, key: unknown): { metric: Metric; key: string } | null {
  if (typeof metric !== "string" || !(METRICS as readonly string[]).includes(metric)) return null;
  const raw = typeof key === "string" ? key.trim() : "";
  switch (metric as Metric) {
    case "menu_view": {
      if (raw === "") return { metric: "menu_view", key: "" };
      if (!/^\d{1,2}$/.test(raw)) return null;
      const table = Number(raw);
      return table >= 1 && table <= MAX_TABLE_NUMBER ? { metric: "menu_view", key: String(table) } : null;
    }
    case "product_view":
      return UUID_RE.test(raw) ? { metric: "product_view", key: raw.toLowerCase() } : null;
    case "link_click":
      return (LINK_KEYS as readonly string[]).includes(raw) ? { metric: "link_click", key: raw } : null;
  }
}

export const METRIC_RANGES = [7, 30, 90] as const;
export type MetricRange = (typeof METRIC_RANGES)[number];

export function parseMetricRange(value: string | string[] | undefined): MetricRange {
  const days = Number(Array.isArray(value) ? value[0] : value);
  return (METRIC_RANGES as readonly number[]).includes(days) ? (days as MetricRange) : 30;
}

/** "YYYY-MM-DD" de hoy en México (UTC−6 fijo, igual que `lib/weekly-hours.ts`). */
export function mexicoToday(now: Date): string {
  return new Date(now.getTime() - 6 * 60 * 60_000).toISOString().slice(0, 10);
}

/** Los últimos `days` días, del más viejo a hoy, como "YYYY-MM-DD". */
export function lastDays(today: string, days: number): string[] {
  const end = new Date(`${today}T00:00:00Z`).getTime();
  return Array.from({ length: days }, (_, i) => new Date(end - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

export interface MetricRow {
  day: string;
  metric: string;
  key: string;
  count: number;
}

export interface MetricsSummary {
  /** Visitas al menú por día (todas, con y sin mesa), en el orden de `days`. */
  menuByDay: { day: string; count: number }[];
  menuTotal: number;
  /** Visitas desde el QR de cada mesa, de la mesa 1 en adelante. */
  byTable: { table: number; count: number }[];
  withoutTable: number;
  /** Productos por veces que se abrió su detalle, de más a menos. */
  products: { id: string; count: number }[];
  links: { key: LinkKey; count: number }[];
}

export function summarizeMetrics(rows: MetricRow[], days: string[]): MetricsSummary {
  const inRange = new Set(days);
  const menuDay = new Map<string, number>();
  const tables = new Map<number, number>();
  const products = new Map<string, number>();
  const links = new Map<string, number>();
  let withoutTable = 0;

  for (const row of rows) {
    if (!inRange.has(row.day)) continue;
    if (row.metric === "menu_view") {
      menuDay.set(row.day, (menuDay.get(row.day) ?? 0) + row.count);
      if (row.key === "") withoutTable += row.count;
      else tables.set(Number(row.key), (tables.get(Number(row.key)) ?? 0) + row.count);
    } else if (row.metric === "product_view") {
      products.set(row.key, (products.get(row.key) ?? 0) + row.count);
    } else if (row.metric === "link_click") {
      links.set(row.key, (links.get(row.key) ?? 0) + row.count);
    }
  }

  const menuByDay = days.map((day) => ({ day, count: menuDay.get(day) ?? 0 }));
  return {
    menuByDay,
    menuTotal: menuByDay.reduce((sum, d) => sum + d.count, 0),
    byTable: [...tables].map(([table, count]) => ({ table, count })).sort((a, b) => a.table - b.table),
    withoutTable,
    products: [...products].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count),
    links: LINK_KEYS.map((key) => ({ key, count: links.get(key) ?? 0 })),
  };
}
