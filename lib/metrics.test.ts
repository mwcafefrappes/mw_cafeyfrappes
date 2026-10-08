import { describe, expect, it } from "vitest";
import { lastDays, mexicoToday, normalizeMetricKey, parseMetricRange, summarizeMetrics } from "./metrics";

const PRODUCT = "0b6f3c1e-8a2d-4f5e-9c7b-1d2e3f4a5b6c";

describe("normalizeMetricKey", () => {
  it("visitas al menú: sin mesa o mesa 1–99", () => {
    expect(normalizeMetricKey("menu_view", "")).toEqual({ metric: "menu_view", key: "" });
    expect(normalizeMetricKey("menu_view", undefined)).toEqual({ metric: "menu_view", key: "" });
    expect(normalizeMetricKey("menu_view", "07")).toEqual({ metric: "menu_view", key: "7" });
    expect(normalizeMetricKey("menu_view", "0")).toBeNull();
    expect(normalizeMetricKey("menu_view", "100")).toBeNull();
    expect(normalizeMetricKey("menu_view", "mesa")).toBeNull();
  });

  it("productos por id; enlaces de una lista fija", () => {
    expect(normalizeMetricKey("product_view", PRODUCT.toUpperCase())).toEqual({ metric: "product_view", key: PRODUCT });
    expect(normalizeMetricKey("product_view", "frappe-moka")).toBeNull();
    expect(normalizeMetricKey("link_click", "whatsapp")).toEqual({ metric: "link_click", key: "whatsapp" });
    expect(normalizeMetricKey("link_click", "tiktok")).toBeNull();
    expect(normalizeMetricKey("compras", "x")).toBeNull();
  });
});

describe("rangos y fechas", () => {
  it("7, 30 o 90 días; 30 por defecto", () => {
    expect(parseMetricRange("7")).toBe(7);
    expect(parseMetricRange("365")).toBe(30);
    expect(parseMetricRange(undefined)).toBe(30);
  });

  it("hoy en México y los días hacia atrás", () => {
    // 9 oct 03:00 UTC = 8 oct 21:00 en México.
    expect(mexicoToday(new Date("2026-10-09T03:00:00Z"))).toBe("2026-10-08");
    expect(lastDays("2026-10-02", 3)).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
  });
});

describe("summarizeMetrics", () => {
  const days = ["2026-10-07", "2026-10-08"];
  const rows = [
    { day: "2026-10-07", metric: "menu_view", key: "", count: 10 },
    { day: "2026-10-07", metric: "menu_view", key: "3", count: 2 },
    { day: "2026-10-08", metric: "menu_view", key: "1", count: 4 },
    { day: "2026-10-08", metric: "menu_view", key: "3", count: 1 },
    { day: "2026-09-01", metric: "menu_view", key: "", count: 99 },
    { day: "2026-10-08", metric: "product_view", key: "a", count: 3 },
    { day: "2026-10-07", metric: "product_view", key: "b", count: 5 },
    { day: "2026-10-08", metric: "product_view", key: "a", count: 4 },
    { day: "2026-10-08", metric: "link_click", key: "whatsapp", count: 6 },
  ];

  it("suma por día, por mesa, por producto y por enlace (solo dentro del rango)", () => {
    const summary = summarizeMetrics(rows, days);
    expect(summary.menuByDay).toEqual([
      { day: "2026-10-07", count: 12 },
      { day: "2026-10-08", count: 5 },
    ]);
    expect(summary.menuTotal).toBe(17);
    expect(summary.withoutTable).toBe(10);
    expect(summary.byTable).toEqual([
      { table: 1, count: 4 },
      { table: 3, count: 3 },
    ]);
    expect(summary.products).toEqual([
      { id: "a", count: 7 },
      { id: "b", count: 5 },
    ]);
    expect(summary.links).toEqual([
      { key: "whatsapp", count: 6 },
      { key: "instagram", count: 0 },
      { key: "facebook", count: 0 },
      { key: "maps", count: 0 },
    ]);
  });
});
