import { describe, expect, it } from "vitest";
import { isSlotAvailable, mexicoDay, normalizeIso, scheduleDays, slotIso } from "./order-slots";
import type { WeeklyHour } from "./weekly-hours";

/** Jueves a domingo, 19:00–23:00 (horario confirmado). */
const MW_HOURS: WeeklyHour[] = [4, 5, 6, 0].map((day) => ({ day, start: "19:00", end: "23:00" }));
const RULES = { leadMinutes: 120, slotMinutes: 30, maxPerSlot: 5, maxDaysAhead: 7 };

/** Hora de México → Date (UTC−6). */
function mx(local: string): Date {
  return new Date(`${local}:00-06:00`);
}

describe("slotIso / mexicoDay", () => {
  it("19:00 en México = 01:00 UTC del día siguiente", () => {
    expect(slotIso("2026-10-08", 19 * 60)).toBe("2026-10-09T01:00:00Z");
    expect(mexicoDay(mx("2026-10-08T23:30"))).toBe("2026-10-08");
  });

  it("normaliza lo que manda el navegador", () => {
    expect(normalizeIso("2026-10-09T01:00:00.000Z")).toBe("2026-10-09T01:00:00Z");
    expect(normalizeIso("mañana")).toBeNull();
  });
});

describe("scheduleDays", () => {
  it("jueves 15:00: hoy desde las 19:00 (2 h de anticipación), cada 30 min hasta las 22:30", () => {
    const days = scheduleDays(MW_HOURS, RULES, mx("2026-10-08T15:00"), new Map());
    expect(days[0].day).toBe("2026-10-08");
    expect(days[0].daysAhead).toBe(0);
    expect(days[0].slots.map((s) => s.minutes / 60)).toEqual([19, 19.5, 20, 20.5, 21, 21.5, 22, 22.5]);
  });

  it("jueves 20:10: lo más pronto es 22:30 (anticipación de 2 h)", () => {
    const days = scheduleDays(MW_HOURS, RULES, mx("2026-10-08T20:10"), new Map());
    expect(days[0].slots.map((s) => s.minutes)).toEqual([22 * 60 + 30]);
  });

  it("solo días que abren, hasta 7 días adelante", () => {
    const days = scheduleDays(MW_HOURS, RULES, mx("2026-10-05T10:00"), new Map()); // lunes
    // Del lunes 5 al lunes 12: abre jueves 8 a domingo 11.
    expect(days.map((d) => d.day)).toEqual(["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
    // Del lunes 12 en adelante (8+ días) ya no se ofrece.
    const fromThursday = scheduleDays(MW_HOURS, RULES, mx("2026-10-08T10:00"), new Map());
    expect(fromThursday.map((d) => d.day)).toEqual(["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-15"]);
  });

  it("0 días adelante = solo hoy", () => {
    const days = scheduleDays(MW_HOURS, { ...RULES, maxDaysAhead: 0 }, mx("2026-10-08T10:00"), new Map());
    expect(days.map((d) => d.day)).toEqual(["2026-10-08"]);
  });

  it("horario lleno con 5 pedidos", () => {
    const iso = slotIso("2026-10-08", 19 * 60);
    const days = scheduleDays(MW_HOURS, RULES, mx("2026-10-08T15:00"), new Map([[iso, 5]]));
    expect(days[0].slots[0]).toMatchObject({ startIso: iso, full: true });
    expect(isSlotAvailable(days, iso)).toBe(false);
    expect(isSlotAvailable(days, slotIso("2026-10-08", 19 * 60 + 30))).toBe(true);
  });

  it("rechaza horarios inventados o fuera de horario", () => {
    const days = scheduleDays(MW_HOURS, RULES, mx("2026-10-08T15:00"), new Map());
    expect(isSlotAvailable(days, slotIso("2026-10-08", 19 * 60 + 15))).toBe(false); // no es múltiplo de 30
    expect(isSlotAvailable(days, slotIso("2026-10-08", 23 * 60))).toBe(false); // ya cerró
    expect(isSlotAvailable(days, slotIso("2026-10-07", 19 * 60))).toBe(false); // miércoles cierra
  });

  it("cierre después de medianoche: viernes 19:00–01:00 ofrece 00:30 del sábado", () => {
    const hours: WeeklyHour[] = [{ day: 5, start: "19:00", end: "01:00" }];
    const days = scheduleDays(hours, RULES, mx("2026-10-09T15:00"), new Map());
    expect(days[0].slots.at(-1)!.startIso).toBe(slotIso("2026-10-09", 24 * 60 + 30));
    // Ya pasada la medianoche, el horario de "ayer" sigue disponible.
    const late = scheduleDays(hours, { ...RULES, leadMinutes: 0 }, mx("2026-10-10T00:10"), new Map());
    expect(late[0]).toMatchObject({ day: "2026-10-09", daysAhead: 0 });
    expect(late[0].slots.map((s) => s.minutes)).toEqual([24 * 60 + 30]);
  });
});
