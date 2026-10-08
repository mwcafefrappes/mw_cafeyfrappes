/**
 * Cálculos del estudio de QR de /admin/qr (portado del artefacto "Estudio
 * QR MW"). Puro: lo usan `QrStudio.tsx` y las pruebas. El dibujo con canvas
 * vive en el componente.
 */

export const ERROR_CORRECTION_LEVELS = ["H", "Q", "M"] as const;
export type ErrorCorrection = (typeof ERROR_CORRECTION_LEVELS)[number];

/** Cuánto del QR puede tapar el logo sin que deje de leerse, según la corrección de errores. */
const EC_RATIO: Record<ErrorCorrection, number> = { M: 0.15, Q: 0.25, H: 0.3 };

/** Enlace que abre el QR: el menú, con `?mesa=N` si es de una mesa (el pedido llega marcado "en mesa"). */
export function qrTargetUrl(menuUrl: string, table: number | null): string {
  if (table === null) return menuUrl;
  const url = new URL(menuUrl);
  url.searchParams.set("mesa", String(table));
  return url.toString();
}

/**
 * Hueco para el logo, en módulos (siempre impar para quedar centrado y
 * sin tocar las esquinas). Misma regla que usa qr-code-styling.
 * `aspect` = alto / ancho del logo; `logoSize` = fracción del QR (0.15–0.45).
 */
export function logoHole(
  moduleCount: number,
  aspect: number,
  logoSize: number,
  ecl: ErrorCorrection
): { x: number; y: number } | null {
  const maxHidden = Math.floor(logoSize * EC_RATIO[ecl] * moduleCount * moduleCount);
  const maxAxis = moduleCount - 14;
  if (maxHidden <= 0 || aspect <= 0) return null;
  let x = Math.floor(Math.sqrt(maxHidden / aspect));
  if (x <= 0) x = 1;
  if (maxAxis < x) x = maxAxis;
  if (x % 2 === 0) x--;
  let y = 1 + 2 * Math.ceil((x * aspect - 1) / 2);
  if (y * x > maxHidden || maxAxis < y) {
    if (maxAxis < y) {
      y = maxAxis;
      if (y % 2 === 0) y--;
    } else y -= 2;
    x = 1 + 2 * Math.ceil((y / aspect - 1) / 2);
    if (maxAxis < x) {
      x = maxAxis;
      if (x % 2 === 0) x--;
    }
  }
  return { x: Math.max(1, x), y: Math.max(1, y) };
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre dos colores "#rrggbb". */
export function contrastRatio(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Aviso si el QR podría no leerse por sus colores; `null` si está bien. */
export function contrastWarning(dots: string, background: string): string | null {
  const ratio = contrastRatio(dots, background);
  if (ratio < 3) {
    return `Contraste bajo (${ratio.toFixed(1)}:1) entre el QR y el fondo: muchos celulares no podrán leerlo. Usa colores más distintos.`;
  }
  if (luminance(dots) > luminance(background)) {
    return "QR claro sobre fondo oscuro: los celulares nuevos lo leen, pero algunos lectores viejos no.";
  }
  return null;
}

/** "Mesa 3" → "mesa-3", para el nombre del archivo descargado. */
export function fileSlug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 40) || "qr"
  );
}

/** "https://www.instagram.com/mw_cafeyfrappes/" → "@mw_cafeyfrappes". */
export function instagramHandle(url: string | null): string | null {
  if (!url) return null;
  try {
    const first = new URL(url).pathname.split("/").filter(Boolean)[0];
    return first ? `@${first}` : null;
  } catch {
    return null;
  }
}
