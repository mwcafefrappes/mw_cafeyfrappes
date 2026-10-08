/**
 * Dibujo del estudio de QR (solo navegador): logo, QR con qr-code-styling y
 * tarjeta para imprimir con el pie de texto. Portado del artefacto "Estudio
 * QR MW"; los cálculos puros están en `lib/qr.ts`.
 */

import type QRCodeStyling from "qr-code-styling";
import type { DotType, CornerSquareType, CornerDotType, Options } from "qr-code-styling";
import { logoHole, type ErrorCorrection } from "@/lib/qr";

export type LineId = "title" | "invite" | "detail" | "signature";

export interface LineStyle {
  /** px sobre una tarjeta de 600 px de ancho (se exporta al doble). */
  size: number;
  weight: number;
  italic: boolean;
  upper: boolean;
  /** Espaciado entre letras, en % del tamaño. */
  track: number;
}

export interface QrDesign {
  styles: Record<LineId, LineStyle>;
  /** "pair" = título en Playfair y lo demás en Figtree (como el sitio); "sans" = todo en Figtree. */
  font: "pair" | "sans";
  lineGap: number;
  qrGap: number;
  colors: { dots: string; bg: string; eye: string; eyeDot: string; title: string; text: string; dots2: string };
  gradient: "none" | "linear" | "radial";
  dotsType: DotType;
  eyeType: CornerSquareType;
  eyeDotType: CornerDotType;
  logoSize: number;
  logoMargin: number;
  pad: number;
  ecl: ErrorCorrection;
  rounded: boolean;
  trim: boolean;
  knock: boolean;
}

export const LINE_IDS: LineId[] = ["title", "invite", "detail", "signature"];

export const DEFAULT_DESIGN: QrDesign = {
  styles: {
    title: { size: 34, weight: 700, italic: false, upper: false, track: 1 },
    invite: { size: 15, weight: 600, italic: false, upper: true, track: 6 },
    detail: { size: 15, weight: 400, italic: false, upper: false, track: 0 },
    signature: { size: 15, weight: 400, italic: true, upper: false, track: 0 },
  },
  font: "pair",
  lineGap: 1,
  qrGap: 1,
  colors: { dots: "#3a2318", bg: "#fffaf2", eye: "#3a2318", eyeDot: "#b5762f", title: "#3a2318", text: "#6b4a35", dots2: "#b5762f" },
  gradient: "none",
  dotsType: "square",
  eyeType: "square",
  eyeDotType: "square",
  logoSize: 0.32,
  logoMargin: 10,
  pad: 11,
  ecl: "H",
  rounded: true,
  trim: true,
  knock: true,
};

const QR_SIZE = 1000;
/** Ancho de la tarjeta exportada (2× el diseño de referencia de 600 px). */
const CARD_WIDTH = 1200;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error("timeout")), 8000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("decode"));
    };
    img.src = src;
  });
}

/** Redibuja cualquier imagen como PNG de máximo 600 px: el generador nunca recibe fotos pesadas ni SVG sin tamaño. */
export async function normalizeImage(src: string): Promise<string> {
  const img = await loadImage(src);
  let w = img.naturalWidth || 600;
  let h = img.naturalHeight || 600;
  const k = Math.min(1, 600 / Math.max(w, h));
  w = Math.max(1, Math.round(w * k));
  h = Math.max(1, Math.round(h * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

/**
 * Recorta márgenes vacíos y quita el fondo claro. El color de fondo se toma
 * de las cuatro esquinas; se toleran textura y motas sueltas.
 */
export async function processLogo(src: string, { trim, knock }: { trim: boolean; knock: boolean }): Promise<string> {
  if (!trim && !knock) return src;
  const img = await loadImage(src);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  let br = 0;
  let bg = 0;
  let bb = 0;
  let n = 0;
  const p = Math.max(2, Math.round(Math.min(w, h) * 0.03));
  for (const [x0, y0] of [
    [0, 0],
    [w - p, 0],
    [0, h - p],
    [w - p, h - p],
  ])
    for (let y = y0; y < y0 + p; y++)
      for (let x = x0; x < x0 + p; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 20) continue;
        br += d[i];
        bg += d[i + 1];
        bb += d[i + 2];
        n++;
      }
  const opaqueBg = n > 0;
  if (opaqueBg) {
    br /= n;
    bg /= n;
    bb /= n;
  }
  const dist = (i: number) => (d[i + 3] < 20 ? 0 : opaqueBg ? Math.hypot(d[i] - br, d[i + 1] - bg, d[i + 2] - bb) : 255);
  const T = 48;

  if (knock && opaqueBg) {
    for (let i = 0; i < d.length; i += 4) {
      const k = dist(i);
      if (k < T * 0.6) d[i + 3] = 0;
      else if (k < T * 1.4) d[i + 3] = Math.round((d[i + 3] * (k - T * 0.6)) / (T * 0.8));
    }
    // Borra motas sueltas (grupos de pocos píxeles), como polvo o textura de la foto.
    const minArea = Math.max(4, Math.round(w * h * 0.00008));
    const seen = new Uint8Array(w * h);
    const stack: number[] = [];
    for (let s0 = 0; s0 < w * h; s0++) {
      if (seen[s0] || d[s0 * 4 + 3] <= 60) continue;
      const comp: number[] = [];
      stack.push(s0);
      seen[s0] = 1;
      while (stack.length) {
        const q = stack.pop()!;
        comp.push(q);
        const qx = q % w;
        const qy = (q / w) | 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = qx + dx;
            const ny = qy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nq = ny * w + nx;
            if (!seen[nq] && d[nq * 4 + 3] > 60) {
              seen[nq] = 1;
              stack.push(nq);
            }
          }
      }
      if (comp.length < minArea) for (const q of comp) d[q * 4 + 3] = 0;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  let x0 = 0;
  let y0 = 0;
  let x1 = w;
  let y1 = h;
  if (trim) {
    const isInk = (i: number) => (knock ? d[i + 3] > 60 : dist(i) >= T);
    const minRow = Math.max(3, Math.round(w * 0.015));
    const minCol = Math.max(3, Math.round(h * 0.015));
    const rows = new Uint32Array(h);
    const cols = new Uint32Array(w);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (isInk((y * w + x) * 4)) {
          rows[y]++;
          cols[x]++;
        }
    // La franja con más dibujo (uniendo huecos chicos): descarta bordes, sombras y motas en las orillas.
    const span = (arr: Uint32Array, min: number, gap: number) => {
      let best: { s: number; e: number; ink: number } | null = null;
      let cur: { s: number; e: number; ink: number } | null = null;
      let lastHit = -1e9;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] < min) continue;
        if (cur && i - lastHit <= gap) {
          cur.e = i + 1;
          cur.ink += arr[i];
        } else {
          if (cur && (!best || cur.ink > best.ink)) best = cur;
          cur = { s: i, e: i + 1, ink: arr[i] };
        }
        lastHit = i;
      }
      if (cur && (!best || cur.ink > best.ink)) best = cur;
      return best;
    };
    const ry = span(rows, minRow, Math.round(h * 0.08));
    const rx = span(cols, minCol, Math.round(w * 0.08));
    if (ry && rx) {
      y0 = ry.s;
      y1 = ry.e;
      x0 = rx.s;
      x1 = rx.e;
    }
    if (x1 - x0 < 8 || y1 - y0 < 8) {
      x0 = 0;
      y0 = 0;
      x1 = w;
      y1 = h;
    } else {
      const m = Math.round(Math.max(x1 - x0, y1 - y0) * 0.06);
      x0 = Math.max(0, x0 - m);
      y0 = Math.max(0, y0 - m);
      x1 = Math.min(w, x1 + m);
      y1 = Math.min(h, y1 + m);
    }
  }
  const out = document.createElement("canvas");
  out.width = x1 - x0;
  out.height = y1 - y0;
  out.getContext("2d")!.drawImage(canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
  return out.toDataURL("image/png");
}

let qrModule: Promise<typeof import("qr-code-styling")> | null = null;

async function createQr(options: Options): Promise<QRCodeStyling> {
  qrModule ??= import("qr-code-styling");
  const { default: QRCodeStylingClass } = await qrModule;
  return new QRCodeStylingClass(options);
}

function qrOptions(design: QrDesign, data: string, type: "canvas" | "svg"): Options {
  const { colors } = design;
  return {
    width: QR_SIZE,
    height: QR_SIZE,
    type,
    margin: 0,
    data,
    qrOptions: { errorCorrectionLevel: design.ecl },
    dotsOptions: {
      type: design.dotsType,
      color: colors.dots,
      ...(design.gradient !== "none" && {
        gradient: {
          type: design.gradient,
          rotation: Math.PI / 4,
          colorStops: [
            { offset: 0, color: colors.dots },
            { offset: 1, color: colors.dots2 },
          ],
        },
      }),
    },
    cornersSquareOptions: { type: design.eyeType, color: colors.eye },
    cornersDotOptions: { type: design.eyeDotType, color: colors.eyeDot },
    backgroundOptions: { color: colors.bg },
  };
}

interface HoleGeometry {
  hx: number;
  hy: number;
  hw: number;
  hh: number;
  lx: number;
  ly: number;
  lw: number;
  lh: number;
}

function holeGeometry(count: number, logo: { width: number; height: number }, design: QrDesign): HoleGeometry | null {
  const dot = Math.floor(QR_SIZE / count);
  const off = Math.floor((QR_SIZE - count * dot) / 2);
  const hole = logoHole(count, logo.height / logo.width, design.logoSize, design.ecl);
  if (!hole) return null;
  const hx = off + ((count - hole.x) / 2) * dot;
  const hy = off + ((count - hole.y) / 2) * dot;
  const hw = hole.x * dot;
  const hh = hole.y * dot;
  const m = Math.min(design.logoMargin * 2, Math.min(hw, hh) / 3);
  const k = Math.min((hw - 2 * m) / logo.width, (hh - 2 * m) / logo.height);
  const lw = logo.width * k;
  const lh = logo.height * k;
  return { hx, hy, hw, hh, lx: hx + (hw - lw) / 2, ly: hy + (hh - lh) / 2, lw, lh };
}

function moduleCount(qr: QRCodeStyling): number {
  const count = qr._qr?.getModuleCount();
  if (!count) throw new Error("qr");
  return count;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("blob"))), "image/png"));
}

/** Familias de letra que `next/font` registró en el layout (`--font-playfair`, `--font-figtree`). */
function fontFamilies(design: QrDesign): { title: string; body: string } {
  const style = getComputedStyle(document.documentElement);
  const figtree = style.getPropertyValue("--font-figtree").trim() || "sans-serif";
  const playfair = style.getPropertyValue("--font-playfair").trim() || "serif";
  return design.font === "pair" ? { title: playfair, body: figtree } : { title: figtree, body: figtree };
}

function lineFont(id: LineId, style: LineStyle, px: number | "{s}", families: { title: string; body: string }): string {
  const family = id === "title" ? families.title : families.body;
  return `${style.italic ? "italic " : ""}${style.weight} ${px}px ${family}, sans-serif`;
}

export async function ensureFonts(design: QrDesign) {
  const families = fontFamilies(design);
  await Promise.all(LINE_IDS.map((id) => document.fonts.load(lineFont(id, design.styles[id], 30, families)))).catch(() => {});
}

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

/** Achica la letra hasta que el renglón quepa. */
function fitText(ctx: Ctx, text: string, font: string, size: number, maxWidth: number, spacing: number): number {
  let s = size;
  while (s > 12) {
    ctx.font = font.replace("{s}", String(s));
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing * s}px`;
    if (ctx.measureText(text).width <= maxWidth) break;
    s -= 1;
  }
  return s;
}

async function composeCard(qrBitmap: ImageBitmap, design: QrDesign, texts: Record<LineId, string>): Promise<Blob> {
  const W = CARD_WIDTH;
  const pad = Math.round(W * (design.pad / 100));
  const qrW = W - pad * 2;
  const S = W / 600;
  const families = fontFamilies(design);
  const lines = LINE_IDS.map((id) => {
    const style = design.styles[id];
    const raw = texts[id].trim();
    return {
      text: style.upper ? raw.toLocaleUpperCase("es-MX") : raw,
      font: lineFont(id, style, "{s}", families),
      size: Math.round(style.size * S),
      spacing: style.track / 100,
      color: id === "title" ? design.colors.title : design.colors.text,
      alpha: id === "signature" ? 0.85 : 1,
      step: Math.round(style.size * S * (id === "title" ? 1.55 : 1.62) * design.lineGap),
    };
  }).filter((line) => line.text);
  const gapTop = Math.round(pad * 0.9 * design.qrGap);
  const textH = lines.length ? gapTop + lines.reduce((sum, line) => sum + line.step, 0) : 0;
  const H = pad + qrW + textH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")! as Ctx;
  ctx.fillStyle = design.colors.bg;
  if (design.rounded) {
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 48);
    ctx.fill();
  } else ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(qrBitmap, pad, pad, qrW, qrW);

  let y = pad + qrW + gapTop;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (const line of lines) {
    const s = fitText(ctx, line.text, line.font, line.size, W - pad * 2, line.spacing);
    ctx.font = line.font.replace("{s}", String(s));
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${line.spacing * s}px`;
    ctx.fillStyle = line.color;
    ctx.globalAlpha = line.alpha;
    // Centrado óptico: el espaciado agrega aire a la derecha de la última letra.
    const baseline = y + Math.round(line.step / 2 + s * 0.36);
    ctx.fillText(line.text, W / 2 + ("letterSpacing" in ctx ? (line.spacing * s) / 2 : 0), baseline);
    y += line.step;
    ctx.globalAlpha = 1;
  }
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  return toBlob(canvas);
}

export interface RenderResult {
  qr: Blob;
  card: Blob;
}

/** El QR (con el logo en un hueco alineado a la cuadrícula) y la tarjeta completa. */
export async function renderQrCard(design: QrDesign, data: string, logo: string | null, texts: Record<LineId, string>): Promise<RenderResult> {
  const qr = await createQr(qrOptions(design, data, "canvas"));
  const plain = await qr.getRawData("png");
  if (!(plain instanceof Blob)) throw new Error("qr");
  const count = moduleCount(qr);

  const canvas = document.createElement("canvas");
  canvas.width = QR_SIZE;
  canvas.height = QR_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(await createImageBitmap(plain), 0, 0);
  if (logo) {
    const logoImg = await loadImage(logo);
    const g = holeGeometry(count, { width: logoImg.naturalWidth, height: logoImg.naturalHeight }, design);
    if (g) {
      ctx.fillStyle = design.colors.bg;
      ctx.fillRect(g.hx, g.hy, g.hw, g.hh);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(logoImg, g.lx, g.ly, g.lw, g.lh);
    }
  }
  const qrBlob = await toBlob(canvas);
  const card = await composeCard(await createImageBitmap(qrBlob), design, texts);
  return { qr: qrBlob, card };
}

/** Solo el QR en SVG (para imprenta: se puede agrandar sin perder calidad). */
export async function renderQrSvg(design: QrDesign, data: string, logo: string | null): Promise<Blob> {
  const qr = await createQr(qrOptions(design, data, "svg"));
  const raw = await qr.getRawData("svg");
  if (!(raw instanceof Blob)) throw new Error("svg");
  let text = await raw.text();
  if (logo) {
    const logoImg = await loadImage(logo);
    const g = holeGeometry(moduleCount(qr), { width: logoImg.naturalWidth, height: logoImg.naturalHeight }, design);
    if (g) {
      const extra =
        `<rect x="${g.hx}" y="${g.hy}" width="${g.hw}" height="${g.hh}" fill="${design.colors.bg}"/>` +
        `<image href="${logo}" x="${g.lx}" y="${g.ly}" width="${g.lw}" height="${g.lh}" preserveAspectRatio="xMidYMid meet"/>`;
      text = text.replace(/<\/svg>\s*$/, `${extra}</svg>`);
    }
  }
  return new Blob([text], { type: "image/svg+xml" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
