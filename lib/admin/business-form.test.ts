import { describe, expect, it } from "vitest";
import {
  isValidClabe,
  normalizeWhatsapp,
  parseContactSection,
  parseHoursSection,
  parseLocationSection,
  parseOrdersSection,
  parsePaymentsSection,
  parseScheduledSection,
  parseSiteSection,
  parseTimeFormatSection,
} from "./business-form";
import type { FormLike } from "./menu-form";
import { effectiveMethods, parsePaymentMatrix } from "../payment-methods";

function form(fields: Record<string, string | string[]>): FormLike {
  return {
    get: (name) => {
      const value = fields[name];
      return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
    },
    getAll: (name) => {
      const value = fields[name];
      return value === undefined ? [] : Array.isArray(value) ? value : [value];
    },
  };
}

/** CLABE de ejemplo con dígito verificador correcto. */
const GOOD_CLABE = "002010077777777771";

describe("normalizeWhatsapp", () => {
  it("deja 52 + 10 dígitos", () => {
    expect(normalizeWhatsapp("958 186 1260")).toBe("529581861260");
    expect(normalizeWhatsapp("+52 (958) 186-1260")).toBe("529581861260");
    expect(normalizeWhatsapp("5219581861260")).toBe("529581861260");
  });

  it("rechaza lo que no es un número mexicano", () => {
    expect(normalizeWhatsapp("186 1260")).toBeNull();
    expect(normalizeWhatsapp("1 555 123 4567 8")).toBeNull();
  });
});

describe("isValidClabe", () => {
  it("revisa largo y dígito verificador", () => {
    expect(isValidClabe(GOOD_CLABE)).toBe(true);
    expect(isValidClabe("002010077777777772")).toBe(false);
    expect(isValidClabe("12345")).toBe(false);
  });
});

describe("parseContactSection", () => {
  it("normaliza WhatsApp y vacía lo opcional", () => {
    const result = parseContactSection(
      form({ business_whatsapp: "958 186 1260", parent_store_name: "Mundo Waffle Huatulco", social_instagram_url: "" })
    );
    expect(result).toMatchObject({ ok: true, value: { business_whatsapp: "529581861260", social_instagram_url: null } });
  });

  it("errores", () => {
    expect(parseContactSection(form({ business_whatsapp: "123", parent_store_name: "X" }))).toMatchObject({ ok: false });
    expect(parseContactSection(form({ parent_store_name: "X", social_facebook_url: "facebook.com/mw" }))).toMatchObject({ ok: false });
    expect(parseContactSection(form({ parent_store_name: "X", business_email: "mw@" }))).toMatchObject({ ok: false });
    expect(parseContactSection(form({ parent_store_name: "" }))).toMatchObject({ ok: false });
  });
});

describe("parseLocationSection", () => {
  it("coordenadas juntas y en rango", () => {
    expect(parseLocationSection(form({ business_lat: "15.7692", business_lng: "-96.1291" }))).toMatchObject({
      ok: true,
      value: { business_lat: 15.7692, business_lng: -96.1291 },
    });
    expect(parseLocationSection(form({ business_lat: "15.7" }))).toMatchObject({ ok: false });
    expect(parseLocationSection(form({ business_lat: "95", business_lng: "0" }))).toMatchObject({ ok: false });
  });
});

describe("parseOrdersSection", () => {
  const base = { order_pickup_enabled: "on", delivery_min_subtotal: "80", delivery_fee: "40", delivery_fee_mode: "auto" };

  it("pesos a centavos", () => {
    expect(parseOrdersSection(form(base), false)).toMatchObject({
      ok: true,
      value: { order_pickup_enabled: true, order_table_enabled: false, delivery_min_subtotal_cents: 8000, delivery_fee_cents: 4000 },
    });
  });

  it("domicilio solo con cobro con tarjeta listo", () => {
    expect(parseOrdersSection(form({ ...base, order_delivery_enabled: "on" }), false)).toMatchObject({ ok: false });
    expect(parseOrdersSection(form({ ...base, order_delivery_enabled: "on" }), true)).toMatchObject({ ok: true });
  });

  it("modo de envío manual o automático", () => {
    expect(parseOrdersSection(form({ ...base, delivery_fee_mode: "manual" }), false)).toMatchObject({ value: { delivery_fee_mode: "manual" } });
    expect(parseOrdersSection(form({ ...base, delivery_fee_mode: "gratis" }), false)).toMatchObject({ ok: false });
  });
});

describe("parsePaymentsSection", () => {
  it("matriz: domicilio siempre solo tarjeta", () => {
    const result = parsePaymentsSection(form({ pay_pickup: ["cash", "transfer"], pay_table: ["cash"] }), false);
    expect(result).toMatchObject({
      ok: true,
      value: { payment_methods: { pickup: ["cash", "transfer"], table: ["cash"], delivery: ["card"] } },
    });
  });

  it("tarjeta en mostrador solo con Stripe; al menos un método", () => {
    expect(parsePaymentsSection(form({ pay_pickup: ["card"], pay_table: ["cash"] }), false)).toMatchObject({ ok: false });
    expect(parsePaymentsSection(form({ pay_pickup: ["card"], pay_table: ["cash"] }), true)).toMatchObject({ ok: true });
    expect(parsePaymentsSection(form({ pay_pickup: [], pay_table: ["cash"] }), true)).toMatchObject({ ok: false });
  });

  it("CLABE con espacios se limpia; inválida se rechaza", () => {
    const spaced = GOOD_CLABE.replace(/(\d{6})/g, "$1 ");
    expect(parsePaymentsSection(form({ pay_pickup: ["cash"], pay_table: ["cash"], transfer_clabe: spaced }), false)).toMatchObject({
      value: { transfer_clabe: GOOD_CLABE },
    });
    expect(
      parsePaymentsSection(form({ pay_pickup: ["cash"], pay_table: ["cash"], transfer_clabe: "002010077777777772" }), false)
    ).toMatchObject({ ok: false });
  });
});

describe("parseScheduledSection", () => {
  const base = {
    scheduled_orders_enabled: "on",
    scheduled_min_lead_minutes: "120",
    scheduled_slot_minutes: "30",
    scheduled_max_per_slot: "5",
    scheduled_max_days_ahead: "7",
  };

  it("valores confirmados (2 h, 30 min, 5, 7 días)", () => {
    expect(parseScheduledSection(form(base))).toEqual({
      ok: true,
      value: {
        scheduled_orders_enabled: true,
        scheduled_min_lead_minutes: 120,
        scheduled_slot_minutes: 30,
        scheduled_max_per_slot: 5,
        scheduled_max_days_ahead: 7,
      },
    });
  });

  it("fuera de rango", () => {
    expect(parseScheduledSection(form({ ...base, scheduled_slot_minutes: "25" }))).toMatchObject({ ok: false });
    expect(parseScheduledSection(form({ ...base, scheduled_max_per_slot: "0" }))).toMatchObject({ ok: false });
    expect(parseScheduledSection(form({ ...base, scheduled_min_lead_minutes: "2000" }))).toMatchObject({ ok: false });
    expect(parseScheduledSection(form({ ...base, scheduled_max_days_ahead: "61" }))).toMatchObject({ ok: false });
  });
});

describe("parseSiteSection", () => {
  it("quita la diagonal final y valida largos", () => {
    expect(parseSiteSection(form({ site_url: "https://mw.vercel.app/" }))).toMatchObject({ value: { site_url: "https://mw.vercel.app" } });
    expect(parseSiteSection(form({ seo_title: "x".repeat(71) }))).toMatchObject({ ok: false });
  });
});

describe("parsePaymentMatrix / effectiveMethods", () => {
  it("descarta lo no permitido y usa valores por defecto", () => {
    expect(parsePaymentMatrix({ pickup: ["card", "cash", "bitcoin"], delivery: ["cash", "card"] })).toEqual({
      pickup: ["cash", "card"],
      table: ["cash", "transfer"],
      delivery: ["card"],
    });
    expect(parsePaymentMatrix(null).delivery).toEqual(["card"]);
  });

  it("sin Stripe no se ofrece tarjeta", () => {
    const matrix = parsePaymentMatrix({ pickup: ["cash", "card"], table: ["cash"], delivery: ["card"] });
    expect(effectiveMethods(matrix, "pickup", false)).toEqual(["cash"]);
    expect(effectiveMethods(matrix, "delivery", false)).toEqual([]);
    expect(effectiveMethods(matrix, "delivery", true)).toEqual(["card"]);
  });
});

describe("parseHoursSection", () => {
  const mwDays = Object.fromEntries(
    [4, 5, 6, 0].flatMap((day) => [
      [`open_${day}`, "on"],
      [`start_${day}`, "19:00"],
      [`end_${day}`, "23:00"],
    ])
  );

  it("solo guarda los días abiertos (jueves a domingo)", () => {
    const result = parseHoursSection(form({ ...mwDays, start_1: "09:00", end_1: "14:00" }));
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.weekly_hours).toEqual([
      { day: 0, start: "19:00", end: "23:00" },
      { day: 4, start: "19:00", end: "23:00" },
      { day: 5, start: "19:00", end: "23:00" },
      { day: 6, start: "19:00", end: "23:00" },
    ]);
  });

  it("acepta segundos del navegador y cierre después de medianoche", () => {
    expect(parseHoursSection(form({ open_5: "on", start_5: "19:00:00", end_5: "01:00" }))).toMatchObject({
      ok: true,
      value: { weekly_hours: [{ day: 5, start: "19:00", end: "01:00" }] },
    });
  });

  it("todos cerrados se permite; horas mal escritas o iguales no", () => {
    expect(parseHoursSection(form({}))).toMatchObject({ ok: true, value: { weekly_hours: [] } });
    expect(parseHoursSection(form({ open_4: "on", start_4: "7pm", end_4: "23:00" }))).toMatchObject({ ok: false });
    expect(parseHoursSection(form({ open_4: "on", start_4: "19:00", end_4: "19:00" }))).toMatchObject({ ok: false });
  });
});

describe("parseTimeFormatSection", () => {
  it("solo formatos conocidos", () => {
    expect(parseTimeFormatSection(form({ time_format: "words" }))).toEqual({ ok: true, value: { time_format: "words" } });
    expect(parseTimeFormatSection(form({ time_format: "am-pm" }))).toMatchObject({ ok: false });
  });
});
