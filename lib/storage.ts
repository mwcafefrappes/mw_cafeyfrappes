/**
 * Buckets públicos de solo lectura en Supabase Storage. Las subidas
 * siempre se hacen desde `/admin` con `service_role`; estas funciones
 * solo arman la URL pública.
 *
 * Los nombres de archivo llevan un timestamp (`${id}-${Date.now()}.ext`):
 * cada cambio genera una ruta nueva, así que nunca hay que invalidar
 * cachés a mano.
 *
 * Una ruta que empieza con "/" es un archivo estático de `public/` (las
 * fotos de ejemplo del seed viven en `public/sample`) y se usa tal cual.
 */

import { env } from "./config/business";

export const MENU_PHOTOS_BUCKET = "menu-photos";
export const MENU_MODELS_BUCKET = "menu-models";
export const SITE_ASSETS_BUCKET = "site-assets";
/** Privado: comprobantes de transferencia. Solo el servidor sube; el panel los ve con URLs firmadas. */
export const PAYMENT_PROOFS_BUCKET = "payment-proofs";

/** `cacheControl` para `.upload()`: 1 año, seguro porque cada subida tiene una ruta nueva. */
export const LONG_CACHE_CONTROL = "31536000";

function publicUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("/")) return path;
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export function getMenuPhotoUrl(path: string | null): string | null {
  return publicUrl(MENU_PHOTOS_BUCKET, path);
}

export function getMenuModelUrl(path: string | null): string | null {
  return publicUrl(MENU_MODELS_BUCKET, path);
}

export function getSiteAssetUrl(path: string | null): string | null {
  return publicUrl(SITE_ASSETS_BUCKET, path);
}

/** Para el `type` de los íconos del manifest de PWA (`app/manifest.ts`). */
export function guessImageMimeType(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "image/png";
  }
}
