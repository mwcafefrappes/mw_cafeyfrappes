import { describe, expect, it } from "vitest";
import {
  canCustomerCancel,
  canPayOnline,
  canUploadProof,
  needsDeliveryFee,
  nextStatus,
  orderRulesError,
  orderTotals,
  parseOrderRequest,
  priceOrder,
  staffTransitionError,
  startsOnBoard,
  type OrderRequest,
  type OrderRules,
  type PricingProduct,
} from "./orders";

const FRAPPE: PricingProduct = {
  id: "p-frappe",
  name: "Frappé moka",
  base_price_cents: 7000,
  is_available: true,
  product_sizes: [
    { id: "s-12", name: "12 oz", price_cents: 7000 },
    { id: "s-16", name: "16 oz", price_cents: 8500 },
  ],
  extra_groups: [
    {
      id: "g-extras",
      name: "Extras",
      min_select: 0,
      max_select: 2,
      extras: [
        { id: "e-crema", name: "Crema batida", price_cents: 1500, is_available: true },
        { id: "e-shot", name: "Shot extra", price_cents: 2000, is_available: true },
        { id: "e-boba", name: "Boba", price_cents: 2500, is_available: false },
      ],
    },
  ],
};

const WAFFLE: PricingProduct = {
  id: "p-waffle",
  name: "Waffle clásico",
  base_price_cents: 9000,
  is_available: true,
  product_sizes: [],
  extra_groups: [],
};

const PRODUCTS = new Map([FRAPPE, WAFFLE].map((p) => [p.id, p]));

const BASE = {
  type: "pickup",
  table: null,
  scheduledFor: null,
  name: "Ana",
  phone: "958 123 4567",
  paymentMethod: "cash",
  note: "",
  items: [{ productId: "p-waffle", sizeId: null, extraIds: [], quantity: 1, note: "" }],
};

/** El local (business_lat/lng) y un punto a ~1.1 km. */
const STORE = { lat: 15.7692212, lng: -96.1291265 };
const NEAR = { lat: 15.7792, lng: -96.1291 };
const FAR = { lat: 15.8292, lng: -96.1291 };

const DELIVERY = {
  ...BASE,
  type: "delivery",
  paymentMethod: "card",
  delivery: { address: "Bugambilia 204, Sector H", references: "portón negro", point: NEAR },
};

describe("parseOrderRequest", () => {
  it("recoger: nombre y teléfono obligatorios; el teléfono se normaliza", () => {
    expect(parseOrderRequest(BASE)).toMatchObject({ ok: true, value: { phone: "529581234567", table: null } });
    expect(parseOrderRequest({ ...BASE, phone: "" })).toMatchObject({ ok: false });
    expect(parseOrderRequest({ ...BASE, name: "  " })).toMatchObject({ ok: false });
  });

  it("mesa: solo nombre, mesa válida y siempre 'ahora'", () => {
    expect(parseOrderRequest({ ...BASE, type: "table", table: 3, phone: "" })).toMatchObject({ ok: true, value: { table: 3, phone: null } });
    expect(parseOrderRequest({ ...BASE, type: "table", table: 0, phone: "" })).toMatchObject({ ok: false });
    expect(parseOrderRequest({ ...BASE, type: "table", table: 3, scheduledFor: "2026-10-09T01:00:00Z" })).toMatchObject({ ok: false });
  });

  it("domicilio: teléfono, dirección y punto en el mapa obligatorios; se puede programar", () => {
    expect(parseOrderRequest(DELIVERY)).toMatchObject({
      ok: true,
      value: { type: "delivery", phone: "529581234567", delivery: { address: "Bugambilia 204, Sector H", references: "portón negro", point: NEAR } },
    });
    expect(parseOrderRequest({ ...DELIVERY, scheduledFor: "2026-10-09T01:00:00Z" })).toMatchObject({ ok: true });
    expect(parseOrderRequest({ ...DELIVERY, phone: "" })).toMatchObject({ ok: false });
    expect(parseOrderRequest({ ...DELIVERY, delivery: { ...DELIVERY.delivery, address: " " } })).toMatchObject({ ok: false, error: expect.stringMatching(/calle/) });
    expect(parseOrderRequest({ ...DELIVERY, delivery: { ...DELIVERY.delivery, point: null } })).toMatchObject({ ok: false, error: expect.stringMatching(/mapa/) });
    expect(parseOrderRequest({ ...DELIVERY, delivery: { ...DELIVERY.delivery, point: { lat: "15.7", lng: -96 } } })).toMatchObject({ ok: false });
    expect(parseOrderRequest({ ...DELIVERY, delivery: undefined })).toMatchObject({ ok: false });
    expect(parseOrderRequest({ ...DELIVERY, delivery: { ...DELIVERY.delivery, address: "x".repeat(161) } })).toMatchObject({ ok: false });
    // Para recoger, la dirección se ignora.
    expect(parseOrderRequest({ ...BASE, delivery: DELIVERY.delivery })).toMatchObject({ ok: true, value: { delivery: null } });
  });

  it("valores inválidos", () => {
    expect(parseOrderRequest({ ...BASE, type: "drone" })).toMatchObject({ ok: false });
    expect(parseOrderRequest({ ...BASE, paymentMethod: "bitcoin" })).toMatchObject({ ok: false });
    expect(parseOrderRequest({ ...BASE, items: [] })).toMatchObject({ ok: false });
    expect(parseOrderRequest({ ...BASE, items: [{ ...BASE.items[0], quantity: 21 }] })).toMatchObject({ ok: false });
    expect(parseOrderRequest({ ...BASE, items: [{ ...BASE.items[0], quantity: 1.5 }] })).toMatchObject({ ok: false });
    expect(parseOrderRequest({ ...BASE, scheduledFor: "mañana" })).toMatchObject({ ok: false });
    expect(parseOrderRequest("hola")).toMatchObject({ ok: false });
  });
});

describe("priceOrder (total calculado en el servidor)", () => {
  it("tamaño + extras × cantidad; ignora cualquier precio del navegador", () => {
    const result = priceOrder(
      [
        { productId: "p-frappe", sizeId: "s-16", extraIds: ["e-crema", "e-shot"], quantity: 2, note: "poco hielo" },
        { productId: "p-waffle", sizeId: null, extraIds: [], quantity: 1, note: "" },
      ],
      PRODUCTS
    );
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    // (85 + 15 + 20) × 2 + 90 = 330
    expect(result.value.subtotalCents).toBe(33000);
    expect(result.value.lines[0]).toMatchObject({
      productName: "Frappé moka",
      sizeName: "16 oz",
      extras: [
        { name: "Crema batida", price_cents: 1500 },
        { name: "Shot extra", price_cents: 2000 },
      ],
      unitCents: 12000,
      lineCents: 24000,
      note: "poco hielo",
    });
  });

  it("errores con el nombre del producto", () => {
    expect(priceOrder([{ productId: "p-frappe", sizeId: null, extraIds: [], quantity: 1, note: "" }], PRODUCTS)).toEqual({
      ok: false,
      error: "Elige el tamaño de Frappé moka.",
    });
    expect(priceOrder([{ productId: "p-frappe", sizeId: "s-12", extraIds: ["e-boba"], quantity: 1, note: "" }], PRODUCTS)).toMatchObject({
      ok: false,
    });
    expect(priceOrder([{ productId: "p-borrado", sizeId: null, extraIds: [], quantity: 1, note: "" }], PRODUCTS)).toMatchObject({ ok: false });
    const soldOut = new Map(PRODUCTS).set("p-waffle", { ...WAFFLE, is_available: false });
    expect(priceOrder([BASE.items[0]], soldOut)).toEqual({ ok: false, error: "Waffle clásico se acaba de agotar. Quítalo de tu pedido para continuar." });
  });
});

describe("orderRulesError", () => {
  const rules: OrderRules = {
    pickupEnabled: true,
    tableEnabled: true,
    deliveryEnabled: true,
    delivery: { minSubtotalCents: 8000, feeCents: 4000, feeMode: "auto", radiusM: 5000, store: STORE },
    scheduledEnabled: true,
    tableCount: 6,
    methods: { pickup: ["cash", "transfer"], table: ["cash"], delivery: ["card"] },
    openNow: true,
    slotAvailable: (iso) => iso === "2026-10-09T01:00:00Z",
  };
  const request = (patch: Partial<OrderRequest>): OrderRequest => ({ ...(parseOrderRequest(BASE) as { value: OrderRequest }).value, ...patch });

  it("abierto: pedido para ahora", () => {
    expect(orderRulesError(request({}), rules)).toBeNull();
  });

  it("cerrado: solo programado (recoger)", () => {
    expect(orderRulesError(request({}), { ...rules, openNow: false })).toMatch(/programa/);
    expect(orderRulesError(request({ scheduledFor: "2026-10-09T01:00:00Z" }), { ...rules, openNow: false })).toBeNull();
    expect(orderRulesError(request({ scheduledFor: "2026-10-09T01:30:00Z" }), rules)).toMatch(/ya no está disponible/);
    expect(orderRulesError(request({ scheduledFor: "2026-10-09T01:00:00Z" }), { ...rules, scheduledEnabled: false })).toMatch(/programados/);
  });

  it("tipo apagado, mesa inexistente y matriz de pagos", () => {
    expect(orderRulesError(request({}), { ...rules, pickupEnabled: false })).toMatch(/recoger/);
    expect(orderRulesError(request({ type: "table", table: 7, phone: null }), rules)).toMatch(/mesa/);
    expect(orderRulesError(request({ type: "table", table: 6, phone: null, paymentMethod: "transfer" }), rules)).toMatch(/pago/);
    expect(orderRulesError(request({ paymentMethod: "card" }), rules)).toMatch(/pago/);
  });

  it("domicilio: activo, dentro del radio y solo con tarjeta", () => {
    const delivery = (parseOrderRequest(DELIVERY) as { value: OrderRequest }).value;
    expect(orderRulesError(delivery, rules)).toBeNull();
    expect(orderRulesError({ ...delivery, delivery: { ...delivery.delivery!, point: FAR } }, rules)).toMatch(/fuera de nuestra zona de entrega \(5 km/);
    expect(orderRulesError({ ...delivery, delivery: { ...delivery.delivery!, point: FAR } }, { ...rules, delivery: { ...rules.delivery, radiusM: 7000 } })).toBeNull();
    expect(orderRulesError(delivery, { ...rules, deliveryEnabled: false })).toMatch(/domicilio/);
    expect(orderRulesError(delivery, { ...rules, delivery: { ...rules.delivery, store: null } })).toMatch(/domicilio/);
    expect(orderRulesError({ ...delivery, paymentMethod: "cash" }, rules)).toMatch(/pago/);
    expect(orderRulesError(delivery, { ...rules, openNow: false })).toMatch(/programa/);
  });
});

describe("orderTotals (envío y mínimo)", () => {
  const delivery = { minSubtotalCents: 8000, feeCents: 4000, feeMode: "auto" as const, radiusM: 5000, store: STORE };

  it("recoger y mesa: el total es el subtotal, sin envío", () => {
    expect(orderTotals("pickup", 3000, { delivery })).toEqual({ ok: true, value: { deliveryFeeCents: null, totalCents: 3000 } });
    expect(orderTotals("table", 3000, { delivery })).toEqual({ ok: true, value: { deliveryFeeCents: null, totalCents: 3000 } });
  });

  it("domicilio automático: subtotal + $40", () => {
    expect(orderTotals("delivery", 9000, { delivery })).toEqual({ ok: true, value: { deliveryFeeCents: 4000, totalCents: 13000 } });
  });

  it("domicilio manual: sin envío hasta que la tienda lo pone", () => {
    expect(orderTotals("delivery", 9000, { delivery: { ...delivery, feeMode: "manual" } })).toEqual({ ok: true, value: { deliveryFeeCents: null, totalCents: 9000 } });
  });

  it("mínimo de $80 sin contar el envío", () => {
    expect(orderTotals("delivery", 8000, { delivery })).toMatchObject({ ok: true });
    expect(orderTotals("delivery", 7999, { delivery })).toEqual({ ok: false, error: "El pedido mínimo a domicilio es de $80 (sin el envío)." });
  });

  it("con tarjeta no sale en el tablero hasta pagarse, salvo que falte poner el envío", () => {
    expect(startsOnBoard("cash", null, "pickup")).toBe(true);
    expect(startsOnBoard("transfer", null, "table")).toBe(true);
    expect(startsOnBoard("card", null, "pickup")).toBe(false);
    expect(startsOnBoard("card", 4000, "delivery")).toBe(false);
    expect(startsOnBoard("card", null, "delivery")).toBe(true);
  });
});

describe("estados", () => {
  const cash = { status: "received", payment_method: "cash", payment_status: "pending" } as const;
  const transfer = { status: "received", payment_method: "transfer", payment_status: "pending" } as const;

  it("recibido → preparando → listo → entregado", () => {
    expect(nextStatus(cash)).toBe("preparing");
    expect(nextStatus({ ...cash, status: "preparing" })).toBe("ready");
    expect(nextStatus({ ...cash, status: "ready" })).toBe("delivered");
    expect(nextStatus({ ...cash, status: "delivered" })).toBeNull();
    expect(staffTransitionError(cash, "ready")).toMatch(/no es válido/);
    expect(staffTransitionError({ ...cash, status: "cancelled" }, "preparing")).toMatch(/cerrado/);
  });

  it("transferencia: no se prepara hasta confirmar el pago", () => {
    expect(nextStatus(transfer)).toBeNull();
    expect(staffTransitionError(transfer, "preparing")).toMatch(/transferencia/);
    expect(nextStatus({ ...transfer, payment_status: "paid" })).toBe("preparing");
    expect(canUploadProof(transfer)).toBe(true);
    expect(canUploadProof({ ...transfer, payment_status: "paid" })).toBe(false);
    expect(canUploadProof(cash)).toBe(false);
  });

  it("tarjeta: no se prepara hasta pagar; el envío manual va antes del pago", () => {
    const card = { status: "received", payment_method: "card", payment_status: "pending", type: "delivery", delivery_fee_cents: null } as const;
    expect(needsDeliveryFee(card)).toBe(true);
    expect(canPayOnline(card)).toBe(false);
    expect(nextStatus(card)).toBeNull();
    expect(staffTransitionError(card, "preparing")).toMatch(/tarjeta/);
    const withFee = { ...card, delivery_fee_cents: 4000 };
    expect(needsDeliveryFee(withFee)).toBe(false);
    expect(canPayOnline(withFee)).toBe(true);
    expect(canPayOnline({ ...withFee, payment_status: "paid" })).toBe(false);
    expect(nextStatus({ ...withFee, payment_status: "paid" })).toBe("preparing");
    expect(needsDeliveryFee({ ...card, type: "pickup" })).toBe(false);
    expect(canCustomerCancel(withFee)).toBe(true);
    expect(canCustomerCancel({ ...withFee, payment_status: "paid" })).toBe(false);
  });

  it("cancelar: el cliente solo en 'recibido'; el personal mientras no esté cerrado", () => {
    expect(canCustomerCancel(cash)).toBe(true);
    expect(canCustomerCancel({ ...cash, status: "preparing" })).toBe(false);
    expect(staffTransitionError({ ...cash, status: "ready" }, "cancelled")).toBeNull();
    expect(staffTransitionError({ ...cash, status: "delivered" }, "cancelled")).toMatch(/cerrado/);
  });
});
