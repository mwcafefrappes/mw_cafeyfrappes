import { describe, expect, it } from "vitest";
import { checkoutLines, paidAmountMatches, paymentDeadline } from "./card-payment";

const NOW = new Date("2026-10-09T20:00:00Z");

describe("paymentDeadline", () => {
  it("fuera del tablero: 60 min desde que se hizo el pedido", () => {
    expect(paymentDeadline({ created_at: "2026-10-09T19:55:00Z", on_board: false }, NOW).toISOString()).toBe("2026-10-09T20:55:00.000Z");
  });

  it("si ya casi vence, se alarga lo mínimo que pide Stripe (31 min)", () => {
    expect(paymentDeadline({ created_at: "2026-10-09T19:10:00Z", on_board: false }, NOW).toISOString()).toBe("2026-10-09T20:31:00.000Z");
  });

  it("envío manual (en el tablero): 60 min desde que toca Pagar", () => {
    expect(paymentDeadline({ created_at: "2026-10-09T15:00:00Z", on_board: true }, NOW).toISOString()).toBe("2026-10-09T21:00:00.000Z");
  });
});

describe("checkoutLines", () => {
  const items = [
    { product_name: "Frappé moka", size_name: "16 oz", extras: [{ name: "Crema batida", price_cents: 1500 }], unit_cents: 10000, quantity: 2, note: "poco hielo" },
    { product_name: "Waffle clásico", size_name: null, extras: [], unit_cents: 9000, quantity: 1, note: null },
  ];

  it("un renglón por producto, más el envío; suman el total", () => {
    expect(checkoutLines({ number: 3, total_cents: 33000, delivery_fee_cents: 4000 }, items)).toEqual([
      { name: "Frappé moka (16 oz)", description: "+ Crema batida · “poco hielo”", unitCents: 10000, quantity: 2 },
      { name: "Waffle clásico", description: null, unitCents: 9000, quantity: 1 },
      { name: "Envío a domicilio", description: null, unitCents: 4000, quantity: 1 },
    ]);
  });

  it("sin envío (recoger o mesa)", () => {
    expect(checkoutLines({ number: 3, total_cents: 29000, delivery_fee_cents: null }, items)).toHaveLength(2);
  });

  it("si no cuadra con el total, se cobra el total en un solo renglón", () => {
    expect(checkoutLines({ number: 3, total_cents: 30000, delivery_fee_cents: null }, items)).toEqual([
      { name: "Pedido #3", description: null, unitCents: 30000, quantity: 1 },
    ]);
  });
});

describe("paidAmountMatches", () => {
  it("monto y moneda", () => {
    expect(paidAmountMatches({ total_cents: 13500 }, { amount_total: 13500, currency: "mxn" })).toBe(true);
    expect(paidAmountMatches({ total_cents: 13500 }, { amount_total: 9500, currency: "mxn" })).toBe(false);
    expect(paidAmountMatches({ total_cents: 13500 }, { amount_total: 13500, currency: "usd" })).toBe(false);
  });
});
