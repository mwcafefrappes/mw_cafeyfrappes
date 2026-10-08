import { describe, expect, it } from "vitest";
import { contrastRatio, contrastWarning, fileSlug, instagramHandle, logoHole, qrTargetUrl } from "./qr";

describe("qrTargetUrl", () => {
  it("mesa → ?mesa=N; mostrador → el menú tal cual", () => {
    expect(qrTargetUrl("https://mw.vercel.app/menu", 3)).toBe("https://mw.vercel.app/menu?mesa=3");
    expect(qrTargetUrl("https://mw.vercel.app/menu", null)).toBe("https://mw.vercel.app/menu");
  });
});

describe("logoHole", () => {
  it("impar, dentro del límite de la corrección y sin tocar las esquinas", () => {
    const count = 33;
    const hole = logoHole(count, 1, 0.32, "H")!;
    expect(hole.x % 2).toBe(1);
    expect(hole.y % 2).toBe(1);
    expect(hole.x * hole.y).toBeLessThanOrEqual(Math.floor(0.32 * 0.3 * count * count));
    expect(hole.x).toBeLessThanOrEqual(count - 14);
  });

  it("menos corrección = hueco más chico", () => {
    const high = logoHole(33, 1, 0.32, "H")!;
    const medium = logoHole(33, 1, 0.32, "M")!;
    expect(medium.x * medium.y).toBeLessThan(high.x * high.y);
  });

  it("logo ancho = hueco ancho", () => {
    const hole = logoHole(41, 0.5, 0.3, "H")!;
    expect(hole.x).toBeGreaterThan(hole.y);
  });
});

describe("contraste", () => {
  it("negro sobre blanco = 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("avisa contraste bajo y QR claro sobre oscuro", () => {
    expect(contrastWarning("#3a2318", "#fffaf2")).toBeNull();
    expect(contrastWarning("#cccccc", "#ffffff")).toMatch(/Contraste bajo/);
    expect(contrastWarning("#f6ead8", "#22150f")).toMatch(/claro sobre fondo oscuro/);
  });
});

describe("fileSlug / instagramHandle", () => {
  it("nombres de archivo sin acentos", () => {
    expect(fileSlug("Menú digital")).toBe("menu-digital");
    expect(fileSlug("  ")).toBe("qr");
  });

  it("usuario de Instagram desde el enlace", () => {
    expect(instagramHandle("https://www.instagram.com/mw_cafeyfrappes/")).toBe("@mw_cafeyfrappes");
    expect(instagramHandle(null)).toBeNull();
    expect(instagramHandle("no es url")).toBeNull();
  });
});
