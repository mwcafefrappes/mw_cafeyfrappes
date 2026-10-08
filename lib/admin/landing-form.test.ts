import { describe, expect, it } from "vitest";
import { isLandingImageKey, LANDING_HEADING_MAX, LANDING_SUBHEADING_MAX, parseLandingTextForm } from "./landing-form";
import type { FormLike } from "./menu-form";
import { DEFAULT_LANDING_SECTIONS } from "../landing-content";

function form(fields: Record<string, string>): FormLike {
  return { get: (name) => fields[name] ?? null, getAll: (name) => (fields[name] === undefined ? [] : [fields[name]]) };
}

describe("parseLandingTextForm", () => {
  it("limpia espacios y renglones", () => {
    expect(parseLandingTextForm(form({ key: "hero", heading: "  Café   y waffles ", subheading: "Línea uno\n\nlínea dos" }))).toEqual({
      ok: true,
      value: { key: "hero", heading: "Café y waffles", subheading: "Línea uno línea dos" },
    });
  });

  it("vacío = texto original (null)", () => {
    expect(parseLandingTextForm(form({ key: "nosotros", heading: " ", subheading: "" }))).toEqual({
      ok: true,
      value: { key: "nosotros", heading: null, subheading: null },
    });
  });

  it("igual al texto original = null", () => {
    expect(
      parseLandingTextForm(form({ key: "horario", heading: DEFAULT_LANDING_SECTIONS.horario.heading, subheading: "Ven temprano." }))
    ).toEqual({ ok: true, value: { key: "horario", heading: null, subheading: "Ven temprano." } });
  });

  it("rechaza sección desconocida y textos largos", () => {
    expect(parseLandingTextForm(form({ key: "precios", heading: "x" }))).toMatchObject({ ok: false });
    expect(parseLandingTextForm(form({ key: "hero", heading: "x".repeat(LANDING_HEADING_MAX + 1) }))).toMatchObject({ ok: false });
    expect(parseLandingTextForm(form({ key: "hero", subheading: "x".repeat(LANDING_SUBHEADING_MAX + 1) }))).toMatchObject({ ok: false });
  });
});

describe("isLandingImageKey", () => {
  it("solo la portada y quiénes somos llevan foto", () => {
    expect(isLandingImageKey("hero")).toBe(true);
    expect(isLandingImageKey("nosotros")).toBe(true);
    expect(isLandingImageKey("horario")).toBe(false);
  });
});
