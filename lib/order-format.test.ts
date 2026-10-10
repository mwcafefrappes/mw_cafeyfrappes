import { describe, expect, it } from "vitest";
import { dayLabel, orderLineText, orderTypeLabel, phoneLabel, scheduledLabel } from "./order-format";

const NOW = new Date("2026-10-08T21:00:00Z"); // jueves 8 oct, 15:00 en México

describe("dayLabel / scheduledLabel", () => {
  it("hoy, mañana y otros días", () => {
    expect(dayLabel("2026-10-08", "2026-10-08")).toBe("Hoy");
    expect(dayLabel("2026-10-09", "2026-10-08")).toBe("Mañana");
    expect(dayLabel("2026-10-11", "2026-10-08")).toBe("Domingo 11 oct");
  });

  it("hora en el formato del negocio", () => {
    expect(scheduledLabel("2026-10-09T01:30:00Z", "12h", NOW)).toBe("hoy a las 7:30 p. m.");
    expect(scheduledLabel("2026-10-10T01:00:00Z", "words", NOW)).toBe("mañana a las 7 de la tarde");
    expect(scheduledLabel("2026-10-12T02:00:00Z", "24h", NOW)).toBe("el domingo 11 oct a las 20:00");
  });
});

describe("textos del pedido", () => {
  it("renglón con tamaño, extras y nota", () => {
    expect(
      orderLineText({
        product_name: "Frappé moka",
        size_name: "16 oz",
        extras: [{ name: "Crema batida" }, { name: "Shot extra" }],
        quantity: 2,
        line_cents: 24000,
        note: "poco hielo",
      })
    ).toBe("2 × Frappé moka (16 oz) + Crema batida, Shot extra — $240 · Nota: poco hielo");
  });

  it("tipo y teléfono", () => {
    expect(orderTypeLabel({ type: "table", table_number: 3 })).toBe("Mesa 3");
    expect(orderTypeLabel({ type: "pickup", table_number: null })).toBe("Para recoger");
    expect(phoneLabel("529581234567")).toBe("958 123 4567");
    expect(phoneLabel(null)).toBeNull();
  });
});
