import { describe, expect, it } from "vitest";
import { parseRetentionDays, proofCutoff } from "./retention";

describe("comprobantes de transferencia", () => {
  it("se borran los de pedidos de hace más de N días", () => {
    expect(proofCutoff(new Date("2026-10-09T12:00:00Z"), 90).toISOString()).toBe("2026-07-11T12:00:00.000Z");
  });

  it("días: entero entre 7 y 3650", () => {
    expect(parseRetentionDays("90")).toBe(90);
    expect(parseRetentionDays(" 365 ")).toBe(365);
    expect(parseRetentionDays("6")).toBeNull();
    expect(parseRetentionDays("3651")).toBeNull();
    expect(parseRetentionDays("30.5")).toBeNull();
    expect(parseRetentionDays("")).toBeNull();
    expect(parseRetentionDays("noventa")).toBeNull();
  });
});
