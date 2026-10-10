import { describe, expect, it } from "vitest";
import { timeAgoEs } from "./time-ago";

const NOW = Date.UTC(2026, 9, 10, 2, 0);
const MIN = 60_000;

describe("timeAgoEs", () => {
  it("menos de un minuto (o reloj adelantado) es 'hace un momento'", () => {
    expect(timeAgoEs(NOW - 30_000, NOW)).toBe("hace un momento");
    expect(timeAgoEs(NOW + 5 * MIN, NOW)).toBe("hace un momento");
  });

  it("minutos hasta 59", () => {
    expect(timeAgoEs(NOW - 25 * MIN, NOW)).toBe("hace 25 min");
    expect(timeAgoEs(NOW - 59 * MIN, NOW)).toBe("hace 59 min");
  });

  it("horas completas desde 60 minutos", () => {
    expect(timeAgoEs(NOW - 60 * MIN, NOW)).toBe("hace 1 h");
    expect(timeAgoEs(NOW - 179 * MIN, NOW)).toBe("hace 2 h");
  });
});
