import { describe, expect, it } from "vitest";
import { isModelPathFor, looksLikeModel, modelPath, modelSizeCheck } from "./models";

const ID = "9ea38c0d-8990-4ab6-a39d-4d45b1bd7927";

describe("formato del archivo", () => {
  it(".glb empieza con glTF; .usdz es un ZIP", () => {
    expect(looksLikeModel("glb", new TextEncoder().encode("glTF\u0002\u0000"))).toBe(true);
    expect(looksLikeModel("glb", new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(false);
    expect(looksLikeModel("usdz", new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]))).toBe(true);
    expect(looksLikeModel("usdz", new TextEncoder().encode("glTF"))).toBe(false);
    expect(looksLikeModel("glb", new Uint8Array([0x67]))).toBe(false);
  });
});

describe("ruta en Storage", () => {
  it("solo se guarda la ruta que se generó para ese producto y tipo", () => {
    const path = modelPath(ID, "glb", 1791568503418);
    expect(path).toBe(`${ID}-1791568503418.glb`);
    expect(isModelPathFor(ID, "glb", path)).toBe(true);
    expect(isModelPathFor(ID, "usdz", path)).toBe(false);
    expect(isModelPathFor("otro-producto", "glb", path)).toBe(false);
    expect(isModelPathFor(ID, "glb", `../${path}`)).toBe(false);
    expect(isModelPathFor(ID, "glb", `${ID}-1791568503418.glb.exe`)).toBe(false);
  });
});

describe("tamaño", () => {
  it("máximo 10 MB; aviso arriba de 4 MB", () => {
    expect(modelSizeCheck(2 * 1024 * 1024)).toEqual({ error: null, warning: null });
    expect(modelSizeCheck(6 * 1024 * 1024).warning).toMatch(/6\.0 MB/);
    expect(modelSizeCheck(11 * 1024 * 1024).error).toMatch(/máximo es 10\.0 MB/);
    expect(modelSizeCheck(0).error).toMatch(/vacío/);
  });
});
