"use client";

/**
 * Estudio de QR (portado del artefacto "Estudio QR MW"): QR del mostrador o
 * de cada mesa, con logo, colores y una tarjeta lista para imprimir. Todo se
 * dibuja en el navegador; el diseño se recuerda en este navegador.
 */

import { useEffect, useRef, useState } from "react";
import type { CornerDotType, CornerSquareType, DotType } from "qr-code-styling";
import { contrastWarning, ERROR_CORRECTION_LEVELS, fileSlug, qrTargetUrl, type ErrorCorrection } from "@/lib/qr";
import { hintClass, inputClass, primaryButtonClass, secondaryButtonClass } from "../ui";
import {
  DEFAULT_DESIGN,
  downloadBlob,
  ensureFonts,
  LINE_IDS,
  normalizeImage,
  processLogo,
  renderQrCard,
  renderQrSvg,
  type LineId,
  type LineStyle,
  type QrDesign,
} from "./qr-render";

const STORAGE_KEY = "mw-qr-studio";
const DEFAULT_LOGO = "/brand/mw-logo-espresso.png";

interface Texts {
  generalTitle: string;
  tableInvite: string;
  generalInvite: string;
  detail: string;
  signature: string;
}

interface Saved {
  design: QrDesign;
  texts: Texts;
}

const LINE_LABELS: Record<LineId, string> = { title: "Título", invite: "Invitación", detail: "Detalle", signature: "Firma" };

const WEIGHTS = [
  [400, "Normal"],
  [500, "Media"],
  [600, "Seminegrita"],
  [700, "Negrita"],
] as const;

const DOT_TYPES: [DotType, string][] = [
  ["square", "Cuadrado"],
  ["rounded", "Suave"],
  ["extra-rounded", "Redondo"],
  ["dots", "Puntos"],
  ["classy", "Clásico"],
  ["classy-rounded", "Clásico suave"],
];
const EYE_TYPES: [CornerSquareType, string][] = [
  ["square", "Cuadrado"],
  ["extra-rounded", "Redondeado"],
  ["dot", "Círculo"],
];
const EYE_DOT_TYPES: [CornerDotType, string][] = [
  ["square", "Cuadrado"],
  ["dot", "Círculo"],
];
const ECL_LABELS: Record<ErrorCorrection, string> = {
  H: "Alta · recomendada con logo",
  Q: "Media-alta",
  M: "Media · QR más simple",
};

const PRESETS: [string, Omit<QrDesign["colors"], "dots2">][] = [
  ["Espresso", { dots: "#3a2318", eye: "#3a2318", eyeDot: "#b5762f", bg: "#fffaf2", title: "#3a2318", text: "#6b4a35" }],
  ["Kraft", { dots: "#3a2318", eye: "#3a2318", eyeDot: "#3a2318", bg: "#efe0c6", title: "#3a2318", text: "#5e4232" }],
  ["Rosa terraza", { dots: "#3a2318", eye: "#b5626a", eyeDot: "#b5626a", bg: "#fff4f1", title: "#3a2318", text: "#8a5a5c" }],
  ["Tinta", { dots: "#111111", eye: "#111111", eyeDot: "#111111", bg: "#ffffff", title: "#111111", text: "#4a4a4a" }],
  ["Noche MW", { dots: "#f6ead8", eye: "#d9a066", eyeDot: "#d9a066", bg: "#22150f", title: "#f6ead8", text: "#cdb49a" }],
];

const COLOR_LABELS: [keyof QrDesign["colors"], string][] = [
  ["dots", "Puntos del QR"],
  ["bg", "Fondo"],
  ["eye", "Esquinas (marco)"],
  ["eyeDot", "Esquinas (centro)"],
  ["title", "Título"],
  ["text", "Texto del pie"],
];

function readSaved(defaults: Texts): Saved {
  const fallback = { design: DEFAULT_DESIGN, texts: defaults };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<Saved>;
    return {
      design: { ...DEFAULT_DESIGN, ...saved.design, colors: { ...DEFAULT_DESIGN.colors, ...saved.design?.colors } },
      texts: { ...defaults, ...saved.texts },
    };
  } catch {
    return fallback;
  }
}

function textsFor(texts: Texts, table: number | null): Record<LineId, string> {
  return {
    title: table === null ? texts.generalTitle : `Mesa ${table}`,
    invite: table === null ? texts.generalInvite : texts.tableInvite,
    detail: texts.detail,
    signature: texts.signature,
  };
}

const chipClass =
  "relative flex cursor-pointer items-center rounded-[8px] border border-brand-border bg-brand-cream px-2.5 py-1.5 text-xs font-medium has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary has-[:checked]:text-brand-on-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-primary/50";
const sectionClass = "group border-t border-brand-border first:border-t-0";
const summaryClass = "flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 text-sm font-semibold [&::-webkit-details-marker]:hidden";
const fieldLabelClass = "flex flex-col gap-1.5 text-xs font-semibold text-brand-ink/70";

function Section({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className={sectionClass} open={open}>
      <summary className={summaryClass}>
        {title}
        <span aria-hidden className="text-brand-ink/50 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
    </details>
  );
}

function Chips<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([option, label]) => (
        <label key={option} className={chipClass}>
          <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} className="sr-only" />
          {label}
        </label>
      ))}
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className={fieldLabelClass}>
      <span className="flex justify-between">
        {label}
        <output className="font-normal tabular-nums">{format(value)}</output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-brand-primary" />
    </label>
  );
}

function LineTools({ style, onChange, label }: { style: LineStyle; onChange: (style: LineStyle) => void; label: string }) {
  const setSize = (size: number) => onChange({ ...style, size: Math.min(64, Math.max(8, size)) });
  const toggleClass =
    "flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-[7px] border border-brand-border bg-brand-cream px-2 text-xs font-semibold has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary has-[:checked]:text-brand-on-primary";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex h-8 items-center overflow-hidden rounded-[7px] border border-brand-border bg-brand-cream">
        <button type="button" onClick={() => setSize(style.size - 1)} aria-label={`${label}: letra más chica`} className="h-full w-7 cursor-pointer hover:bg-brand-sand">
          −
        </button>
        <span className="w-8 text-center text-xs tabular-nums" aria-label="Tamaño de letra">
          {style.size}
        </span>
        <button type="button" onClick={() => setSize(style.size + 1)} aria-label={`${label}: letra más grande`} className="h-full w-7 cursor-pointer hover:bg-brand-sand">
          +
        </button>
      </span>
      <select
        value={style.weight}
        onChange={(e) => onChange({ ...style, weight: Number(e.target.value) })}
        aria-label={`${label}: grosor`}
        className="h-8 rounded-[7px] border border-brand-border bg-brand-cream px-1.5 text-xs"
      >
        {WEIGHTS.map(([weight, name]) => (
          <option key={weight} value={weight}>
            {name}
          </option>
        ))}
      </select>
      <label className={toggleClass} title="Cursiva">
        <input type="checkbox" checked={style.italic} onChange={(e) => onChange({ ...style, italic: e.target.checked })} className="sr-only" aria-label={`${label}: cursiva`} />
        <span className="font-serif italic">I</span>
      </label>
      <label className={toggleClass} title="Mayúsculas">
        <input type="checkbox" checked={style.upper} onChange={(e) => onChange({ ...style, upper: e.target.checked })} className="sr-only" aria-label={`${label}: mayúsculas`} />
        AA
      </label>
      <label className="flex min-w-[8rem] flex-1 items-center gap-1.5 text-[11px] text-brand-ink/60">
        Espaciado
        <input type="range" min={-5} max={40} step={1} value={style.track} onChange={(e) => onChange({ ...style, track: Number(e.target.value) })} className="min-w-0 flex-1 accent-brand-primary" />
      </label>
    </div>
  );
}

export default function QrStudio({ menuUrl, tableCount, defaultTexts }: { menuUrl: string; tableCount: number; defaultTexts: Texts }) {
  const [{ design, texts }, setSaved] = useState<Saved>(() => readSaved(defaultTexts));
  const [table, setTable] = useState<number | null>(tableCount > 0 ? 1 : null);
  const [logoSrc, setLogoSrc] = useState<string | null>(DEFAULT_LOGO);
  const [logoName, setLogoName] = useState("Logo MW (café)");
  const [logo, setLogo] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; card: Blob; qr: Blob; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone?: "ok" | "warn" } | null>(null);
  const renderToken = useRef(0);

  const setDesign = (patch: Partial<QrDesign>) => setSaved((s) => ({ ...s, design: { ...s.design, ...patch } }));
  const setColors = (patch: Partial<QrDesign["colors"]>) => setSaved((s) => ({ ...s, design: { ...s.design, colors: { ...s.design.colors, ...patch } } }));
  const setStyle = (id: LineId, style: LineStyle) => setSaved((s) => ({ ...s, design: { ...s.design, styles: { ...s.design.styles, [id]: style } } }));
  const setText = (patch: Partial<Texts>) => setSaved((s) => ({ ...s, texts: { ...s.texts, ...patch } }));

  const effectiveTable = table !== null && table <= tableCount ? table : null;
  const data = qrTargetUrl(menuUrl, effectiveTable);
  const lineTexts = textsFor(texts, effectiveTable);
  const warning = contrastWarning(design.colors.dots, design.colors.bg);

  // Recordar el diseño y los textos en este navegador.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ design, texts }));
    } catch {
      // Sin almacenamiento (modo privado): el diseño solo dura mientras la página esté abierta.
    }
  }, [design, texts]);

  // Logo: se normaliza al cargarlo y se recorta / limpia según las casillas.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!logoSrc) {
        if (!cancelled) setLogo(null);
        return;
      }
      try {
        const processed = await processLogo(logoSrc, { trim: design.trim, knock: design.knock });
        if (!cancelled) setLogo(processed);
      } catch {
        if (!cancelled) setLogo(logoSrc);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logoSrc, design.trim, design.knock]);

  // Vista previa: un dibujo a la vez, 150 ms después del último cambio.
  const textsKey = JSON.stringify(lineTexts);
  useEffect(() => {
    const token = ++renderToken.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        await ensureFonts(design);
        const result = await renderQrCard(design, data, logoSrc ? logo : null, JSON.parse(textsKey));
        if (token !== renderToken.current) return;
        const bitmap = await createImageBitmap(result.card);
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old.url);
          return { url: URL.createObjectURL(result.card), card: result.card, qr: result.qr, width: bitmap.width, height: bitmap.height };
        });
      } catch {
        if (token === renderToken.current) {
          setPreview(null);
          setStatus({ text: "No se pudo generar el QR. Prueba con otro logo o baja la corrección de errores.", tone: "warn" });
        }
      } finally {
        if (token === renderToken.current) setBusy(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [design, data, logo, logoSrc, textsKey]);

  const loadFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ text: "Ese archivo no es una imagen. Usa PNG, JPG, WebP o SVG.", tone: "warn" });
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setStatus({ text: "No se pudo leer el archivo. Intenta con otro.", tone: "warn" });
    reader.onload = async () => {
      try {
        setLogoSrc(await normalizeImage(String(reader.result)));
        setLogoName(file.name);
        setStatus(null);
      } catch {
        setStatus({
          text: /heic|heif/i.test(file.name + file.type)
            ? "Las fotos HEIC del iPhone no se pueden abrir aquí. Conviértela a JPG o PNG (o haz una captura de pantalla)."
            : "No se pudo abrir esa imagen. Prueba con un PNG o JPG.",
          tone: "warn",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const baseName = fileSlug(lineTexts.title || "qr");

  const downloadSvg = async () => {
    try {
      downloadBlob(await renderQrSvg(design, data, logoSrc ? logo : null), `${baseName}-qr.svg`);
    } catch {
      setStatus({ text: "No se pudo generar el SVG.", tone: "warn" });
    }
  };

  const downloadAllTables = async () => {
    setBusy(true);
    try {
      await ensureFonts(design);
      for (let n = 1; n <= tableCount; n++) {
        setStatus({ text: `Preparando mesa ${n} de ${tableCount}…` });
        const result = await renderQrCard(design, qrTargetUrl(menuUrl, n), logoSrc ? logo : null, textsFor(texts, n));
        downloadBlob(result.card, `mesa-${n}-tarjeta.png`);
        // El navegador puede preguntar una vez si permites descargar varios archivos.
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      setStatus({ text: `Listo: ${tableCount} tarjetas descargadas.`, tone: "ok" });
    } catch {
      setStatus({ text: "No se pudieron generar todas las tarjetas.", tone: "warn" });
    } finally {
      setBusy(false);
    }
  };

  const tableOptions: [string, string][] = [
    ["general", "Mostrador / publicidad"],
    ...Array.from({ length: tableCount }, (_, i): [string, string] => [String(i + 1), `Mesa ${i + 1}`]),
  ];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-[14px] border border-brand-border bg-brand-sand/50">
        <Section title="Para qué es" open>
          <Chips name="qr-target" options={tableOptions} value={effectiveTable === null ? "general" : String(effectiveTable)} onChange={(v) => setTable(v === "general" ? null : Number(v))} />
          <p className={hintClass}>
            Al escanear abre: <span className="break-all font-medium text-brand-ink">{data}</span>
          </p>
          <p className={hintClass}>
            {effectiveTable === null
              ? "Para el mostrador, volantes o redes: abre el menú sin mesa."
              : "El pedido llega marcado con este número de mesa."}
          </p>
        </Section>

        <Section title="Logo al centro" open>
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-brand-border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (data URL) */}
              {logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : <span className="text-xs text-brand-ink/50">—</span>}
            </span>
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              <span className="truncate text-sm font-medium">{logoSrc ? logoName : "Sin logo"}</span>
              <label className={`${secondaryButtonClass} px-3 py-1.5 text-xs`}>
                Elegir imagen
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    loadFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          {logoSrc && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={design.trim} onChange={(e) => setDesign({ trim: e.target.checked })} className="h-4 w-4 accent-brand-primary" />
                Recortar márgenes vacíos
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={design.knock} onChange={(e) => setDesign({ knock: e.target.checked })} className="h-4 w-4 accent-brand-primary" />
                Quitar fondo claro
              </label>
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-xs">
            {logoSrc !== DEFAULT_LOGO && (
              <button
                type="button"
                className="cursor-pointer font-medium underline underline-offset-4"
                onClick={() => {
                  setLogoSrc(DEFAULT_LOGO);
                  setLogoName("Logo MW (café)");
                }}
              >
                Usar el logo de MW
              </button>
            )}
            {logoSrc && (
              <button type="button" className="cursor-pointer font-medium underline underline-offset-4" onClick={() => setLogoSrc(null)}>
                Sin logo
              </button>
            )}
          </div>
        </Section>

        <Section title="Texto al pie">
          {LINE_IDS.map((id) => (
            <div key={id} className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-brand-ink/70">{LINE_LABELS[id]}</span>
              {id === "title" && effectiveTable !== null ? (
                <p className={`${inputClass} text-brand-ink/60`}>Mesa {effectiveTable} (se pone solo)</p>
              ) : (
                <input
                  aria-label={LINE_LABELS[id]}
                  value={
                    id === "title"
                      ? texts.generalTitle
                      : id === "invite"
                        ? effectiveTable === null
                          ? texts.generalInvite
                          : texts.tableInvite
                        : texts[id]
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (id === "title") setText({ generalTitle: value });
                    else if (id === "invite") setText(effectiveTable === null ? { generalInvite: value } : { tableInvite: value });
                    else setText({ [id]: value });
                  }}
                  placeholder="Vacío = no se muestra"
                  className={inputClass}
                />
              )}
              <LineTools label={LINE_LABELS[id]} style={design.styles[id]} onChange={(style) => setStyle(id, style)} />
            </div>
          ))}
          <p className={hintClass}>La invitación de las mesas y la del mostrador se escriben por separado.</p>
          <label className={fieldLabelClass}>
            Tipografía
            <select value={design.font} onChange={(e) => setDesign({ font: e.target.value as QrDesign["font"] })} className={inputClass}>
              <option value="pair">Playfair + Figtree (como el sitio)</option>
              <option value="sans">Solo Figtree</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Range label="Interlineado" value={design.lineGap} min={0.7} max={1.8} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(lineGap) => setDesign({ lineGap })} />
            <Range label="Separación del QR" value={design.qrGap} min={0} max={2.5} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(qrGap) => setDesign({ qrGap })} />
          </div>
        </Section>

        <Section title="Colores">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(([name, colors]) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setColors(colors);
                  setDesign({ gradient: "none" });
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-brand-border bg-brand-cream py-1 pl-1 pr-2 text-xs hover:border-brand-primary"
              >
                <i
                  className="block h-5 w-5 rounded-[5px] border border-black/10"
                  style={{ background: `linear-gradient(135deg, ${colors.dots} 50%, ${colors.eyeDot} 50%)`, outline: `3px solid ${colors.bg}`, outlineOffset: -4 }}
                />
                {name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_LABELS.map(([key, label]) => (
              <label key={key} className="flex min-w-0 items-center gap-2 rounded-[8px] border border-brand-border bg-brand-cream p-1.5">
                <input type="color" value={design.colors[key]} onChange={(e) => setColors({ [key]: e.target.value })} className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-semibold">{label}</span>
                  <code className="text-[11px] text-brand-ink/60">{design.colors[key].toUpperCase()}</code>
                </span>
              </label>
            ))}
          </div>
          <label className={fieldLabelClass}>
            Degradado en el QR
            <select value={design.gradient} onChange={(e) => setDesign({ gradient: e.target.value as QrDesign["gradient"] })} className={inputClass}>
              <option value="none">Sin degradado</option>
              <option value="linear">Diagonal</option>
              <option value="radial">Del centro hacia afuera</option>
            </select>
          </label>
          {design.gradient !== "none" && (
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input type="color" value={design.colors.dots2} onChange={(e) => setColors({ dots2: e.target.value })} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0" />
              Segundo color
            </label>
          )}
          {warning && <p className="text-xs text-amber-800 dark:text-amber-300">{warning}</p>}
        </Section>

        <Section title="Diseño">
          <div className={fieldLabelClass}>
            Forma de los puntos
            <Chips name="qr-dots" options={DOT_TYPES} value={design.dotsType} onChange={(dotsType) => setDesign({ dotsType })} />
          </div>
          <div className={fieldLabelClass}>
            Marco de las esquinas
            <Chips name="qr-eye" options={EYE_TYPES} value={design.eyeType} onChange={(eyeType) => setDesign({ eyeType })} />
          </div>
          <div className={fieldLabelClass}>
            Centro de las esquinas
            <Chips name="qr-eyedot" options={EYE_DOT_TYPES} value={design.eyeDotType} onChange={(eyeDotType) => setDesign({ eyeDotType })} />
          </div>
          <Range label="Tamaño del logo" value={design.logoSize} min={0.15} max={0.45} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(logoSize) => setDesign({ logoSize })} />
          <Range label="Espacio alrededor del logo" value={design.logoMargin} min={0} max={30} step={1} format={(v) => `${v} px`} onChange={(logoMargin) => setDesign({ logoMargin })} />
          <Range label="Margen de la tarjeta" value={design.pad} min={4} max={18} step={1} format={(v) => `${v}%`} onChange={(pad) => setDesign({ pad })} />
          <label className={fieldLabelClass}>
            Resistencia a daños
            <select value={design.ecl} onChange={(e) => setDesign({ ecl: e.target.value as ErrorCorrection })} className={inputClass}>
              {ERROR_CORRECTION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {ECL_LABELS[level]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={design.rounded} onChange={(e) => setDesign({ rounded: e.target.checked })} className="h-4 w-4 accent-brand-primary" />
            Esquinas redondeadas en la tarjeta
          </label>
          <button
            type="button"
            className="cursor-pointer self-start text-xs font-medium underline underline-offset-4"
            onClick={() => {
              if (window.confirm("¿Regresar colores, letras y textos a como venían?")) setSaved({ design: DEFAULT_DESIGN, texts: defaultTexts });
            }}
          >
            Regresar al diseño original
          </button>
        </Section>
      </div>

      <div className="order-first flex flex-col gap-3 lg:sticky lg:top-20 lg:order-none">
        <div
          className="flex min-h-[320px] items-center justify-center rounded-[14px] border border-brand-border bg-brand-kraft/60 p-6"
          style={{ backgroundImage: "radial-gradient(rgb(0 0 0 / 0.08) 1px, transparent 1.2px)", backgroundSize: "14px 14px" }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen generada en el navegador (blob)
            <img
              src={preview.url}
              alt="Vista previa de la tarjeta con el código QR"
              className={`h-auto w-full max-w-[380px] rounded bg-white shadow-[0_12px_30px_-12px_rgb(43_26_18/0.45)] transition-opacity ${busy ? "opacity-60" : ""}`}
            />
          ) : (
            <p className="text-sm text-brand-ink/60">{busy ? "Generando…" : "Sin vista previa"}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryButtonClass} disabled={!preview || busy} onClick={() => preview && downloadBlob(preview.card, `${baseName}-tarjeta.png`)}>
            Descargar tarjeta
          </button>
          <button type="button" className={secondaryButtonClass} disabled={!preview || busy} onClick={() => preview && downloadBlob(preview.qr, `${baseName}-qr.png`)}>
            Solo el QR (PNG)
          </button>
          <button type="button" className={secondaryButtonClass} disabled={!preview || busy} onClick={downloadSvg}>
            Solo el QR (SVG)
          </button>
        </div>
        {tableCount > 1 && (
          <button type="button" className={`${secondaryButtonClass} self-start`} disabled={busy} onClick={downloadAllTables}>
            Descargar las {tableCount} mesas
          </button>
        )}
        <p role="status" className={`min-h-[1.2em] text-xs ${status?.tone === "ok" ? "text-green-700 dark:text-green-400" : status?.tone === "warn" ? "text-amber-800 dark:text-amber-300" : "text-brand-ink/60"}`}>
          {status?.text}
        </p>
        {preview && (
          <p className="text-[11px] tabular-nums text-brand-ink/60">
            Tarjeta {preview.width}×{preview.height} px · QR 1000×1000 px · se imprime bien hasta unos 10 cm. Para más grande, usa el SVG.
          </p>
        )}
      </div>
    </div>
  );
}
