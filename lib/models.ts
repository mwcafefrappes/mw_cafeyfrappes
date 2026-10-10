/**
 * Modelos 3D de productos (`docs/3d-ar.md`). Puro: lo usan el panel, las
 * acciones y las pruebas.
 *
 * - `.glb` (el modelo, obligatorio para "Ver en 3D") y `.usdz` opcional
 *   para iPhone (si no hay, `<model-viewer>` lo genera al vuelo).
 * - Se suben directo a Supabase Storage con un permiso firmado: así no
 *   pasan por Vercel, que corta las subidas a 4.5 MB.
 */

export const MODEL_KINDS = ["glb", "usdz"] as const;
export type ModelKind = (typeof MODEL_KINDS)[number];

/** Tope del bucket `menu-models` (10 MB). */
export const MAX_MODEL_BYTES = 10 * 1024 * 1024;
/** Meta de `docs/3d-ar.md`: carga rápida en 4G y cuidar el 1 GB gratis de Storage. */
export const RECOMMENDED_MODEL_BYTES = 4 * 1024 * 1024;

export const MODEL_CONTENT_TYPES: Record<ModelKind, string> = {
  glb: "model/gltf-binary",
  usdz: "model/vnd.usdz+zip",
};

export function isModelKind(value: unknown): value is ModelKind {
  return value === "glb" || value === "usdz";
}

/** Columna de `products` para cada tipo. */
export function modelColumn(kind: ModelKind): "model_glb_path" | "model_usdz_path" {
  return kind === "glb" ? "model_glb_path" : "model_usdz_path";
}

/** Un `.glb` empieza con "glTF"; un `.usdz` es un ZIP ("PK\x03\x04"). */
export function looksLikeModel(kind: ModelKind, firstBytes: Uint8Array): boolean {
  const magic = kind === "glb" ? [0x67, 0x6c, 0x54, 0x46] : [0x50, 0x4b, 0x03, 0x04];
  return magic.every((byte, index) => firstBytes[index] === byte);
}

/** Nombre del archivo en Storage: `<producto>-<timestamp>.<tipo>` (ruta nueva en cada cambio). */
export function modelPath(productId: string, kind: ModelKind, now: number): string {
  return `${productId}-${now}.${kind}`;
}

/** Solo se acepta guardar una ruta que haya salido de `modelPath` para ese producto y tipo. */
export function isModelPathFor(productId: string, kind: ModelKind, path: string): boolean {
  const escaped = productId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}-\\d{10,}\\.${kind}$`).test(path);
}

/** "3.2 MB". */
export function megabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Revisa el tamaño antes de subir: error si no cabe, aviso si pasa de la meta. */
export function modelSizeCheck(bytes: number): { error: string | null; warning: string | null } {
  if (bytes <= 0) return { error: "El archivo está vacío.", warning: null };
  if (bytes > MAX_MODEL_BYTES) return { error: `El modelo pesa ${megabytes(bytes)}; el máximo es ${megabytes(MAX_MODEL_BYTES)}.`, warning: null };
  if (bytes > RECOMMENDED_MODEL_BYTES) {
    return { error: null, warning: `Pesa ${megabytes(bytes)}: puede tardar en cargar con datos móviles. Lo ideal es menos de ${megabytes(RECOMMENDED_MODEL_BYTES)}.` };
  }
  return { error: null, warning: null };
}
