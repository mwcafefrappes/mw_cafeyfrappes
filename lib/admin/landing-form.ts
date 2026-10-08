/**
 * Validación de /admin/landing (pura: la usan `landing-actions.ts` y las
 * pruebas). Un campo vacío, o igual al texto original, se guarda como
 * `null` = usar el original (`DEFAULT_LANDING_SECTIONS`); así, si después
 * se mejora el texto por defecto, la portada lo toma solo.
 */

import { DEFAULT_LANDING_SECTIONS, LANDING_SECTION_KEYS, type LandingSectionKey } from "../landing-content";
import type { FormLike, FormResult } from "./menu-form";

export const LANDING_HEADING_MAX = 80;
export const LANDING_SUBHEADING_MAX = 400;

/** Secciones que llevan foto en el diseño de la portada. */
export const LANDING_IMAGE_KEYS = ["hero", "nosotros"] as const satisfies LandingSectionKey[];
export type LandingImageKey = (typeof LANDING_IMAGE_KEYS)[number];

export function isLandingSectionKey(value: string): value is LandingSectionKey {
  return (LANDING_SECTION_KEYS as readonly string[]).includes(value);
}

export function isLandingImageKey(value: string): value is LandingImageKey {
  return (LANDING_IMAGE_KEYS as readonly string[]).includes(value);
}

export interface LandingTextInput {
  key: LandingSectionKey;
  heading: string | null;
  subheading: string | null;
}

/** Junta espacios y renglones de más; en la portada cada texto es un solo párrafo. */
function clean(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function parseLandingTextForm(form: FormLike): FormResult<LandingTextInput> {
  const key = clean(form.get("key"));
  if (!isLandingSectionKey(key)) return { ok: false, error: "Sección desconocida." };
  const heading = clean(form.get("heading"));
  if (heading.length > LANDING_HEADING_MAX) return { ok: false, error: `El título puede tener máximo ${LANDING_HEADING_MAX} letras.` };
  const subheading = clean(form.get("subheading"));
  if (subheading.length > LANDING_SUBHEADING_MAX)
    return { ok: false, error: `El texto puede tener máximo ${LANDING_SUBHEADING_MAX} letras.` };
  const fallback = DEFAULT_LANDING_SECTIONS[key];
  return {
    ok: true,
    value: {
      key,
      heading: heading && heading !== fallback.heading ? heading : null,
      subheading: subheading && subheading !== fallback.subheading ? subheading : null,
    },
  };
}
