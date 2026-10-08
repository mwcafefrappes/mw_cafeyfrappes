"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { business } from "@/lib/config/business";
import { describeNextOpening, filterMenu, getNextOpening, parseTableNumber, type TemperatureFilter } from "@/lib/menu";
import type { TimeFormat } from "@/lib/time-format";
import { isOpenAt, type WeeklyHour } from "@/lib/weekly-hours";
import { rememberTable, setSearchParam, useMinuteClock, useSearchParam, useTableNumber } from "./client-state";
import { track } from "../track";
import { ProductPhoto, TagList } from "./ProductBits";
import { ProductSheet } from "./ProductSheet";
import type { MenuCategoryView, MenuProductView } from "./types";

interface MenuViewProps {
  categories: MenuCategoryView[];
  hours: WeeklyHour[];
  timeFormat: TimeFormat;
  serverNow: number;
}

const TEMPERATURE_OPTIONS: { value: TemperatureFilter | null; label: string }[] = [
  { value: null, label: "Todo" },
  { value: "frio", label: "Frío" },
  { value: "caliente", label: "Caliente" },
];

export function MenuView({ categories, hours, timeFormat, serverNow }: MenuViewProps) {
  const now = useMinuteClock(serverNow);
  const open = isOpenAt(hours, new Date(now));
  const nextOpening = open ? null : getNextOpening(hours, new Date(now));

  const table = useTableNumber();
  useEffect(() => {
    if (table !== null) rememberTable(table);
  }, [table]);

  // Métricas: una visita por carga del menú; la mesa solo si vino en el QR
  // (`?mesa=` en la URL), no la recordada de antes.
  const visitCounted = useRef(false);
  useEffect(() => {
    if (visitCounted.current) return;
    visitCounted.current = true;
    const scanned = parseTableNumber(new URLSearchParams(window.location.search).get("mesa"));
    track("menu_view", scanned === null ? "" : String(scanned));
  }, []);

  const [query, setQuery] = useState("");
  const [temperature, setTemperature] = useState<TemperatureFilter | null>(null);
  const visible = useMemo(() => filterMenu(categories, { query, temperature }), [categories, query, temperature]);
  const filtering = query.trim() !== "" || temperature !== null;

  const productSlug = useSearchParam("producto");
  const selected = useMemo(
    () => (productSlug ? (categories.flatMap((c) => c.products).find((p) => p.slug === productSlug) ?? null) : null),
    [categories, productSlug]
  );
  // Métricas: cada vez que se abre el detalle de un producto.
  const selectedId = selected?.id ?? null;
  const lastCountedProduct = useRef<string | null>(null);
  useEffect(() => {
    if (selectedId !== null && lastCountedProduct.current !== selectedId) track("product_view", selectedId);
    lastCountedProduct.current = selectedId;
  }, [selectedId]);

  // true si el producto se abrió desde aquí (con una entrada nueva en el
  // historial); false si llegó en un link compartido.
  const openedHere = useRef(false);

  const openProduct = (product: MenuProductView) => {
    openedHere.current = true;
    setSearchParam("producto", product.slug, "push");
  };
  const closeProduct = () => {
    if (openedHere.current) {
      openedHere.current = false;
      window.history.back();
    } else {
      setSearchParam("producto", null, "replace");
    }
  };

  const activeSlug = useActiveCategory(visible.map((c) => c.slug));

  return (
    <main className="flex flex-1 flex-col bg-brand-cream text-brand-ink">
      <header className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pb-3 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:px-6">
        <Link href="/" aria-label={`Inicio de ${business.name}`} className="shrink-0">
          <Image src="/brand/mw-logo-espresso.png" alt="" width={48} height={48} priority className="h-12 w-12 dark:hidden" />
          <Image src="/brand/mw-logo-crema.png" alt="" width={48} height={48} priority className="hidden h-12 w-12 dark:block" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold leading-tight">Menú</h1>
          <p className="truncate text-xs text-brand-ink/70">{business.name}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border px-2.5 py-0.5 text-xs font-medium">
            <span aria-hidden className={`h-2 w-2 rounded-full ${open ? "bg-green-600" : "bg-brand-stone"}`} />
            {open ? "Abierto" : "Cerrado"}
          </span>
          {table !== null && (
            <span className="rounded-full bg-brand-primary px-2.5 py-0.5 text-xs font-semibold text-brand-on-primary">
              Mesa {table}
            </span>
          )}
        </div>
      </header>

      {!open && (
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <p role="status" className="rounded-[14px] bg-brand-accent-wash px-4 py-3 text-sm">
            <span className="font-semibold">Ahorita estamos cerrados.</span>{" "}
            {nextOpening ? `${endSentence(`Abrimos ${describeNextOpening(nextOpening, timeFormat)}`)} ` : ""}
            Mientras, puedes ver el menú.
          </p>
        </div>
      )}

      <div className="sticky top-0 z-10 mt-3 border-b border-brand-border bg-brand-cream/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2.5 px-4 py-3 sm:px-6">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Buscar en el menú</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-stone" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                enterKeyHint="search"
                className="w-full rounded-full border border-brand-border bg-brand-sand py-2 pl-9 pr-3 text-base placeholder:text-brand-stone focus:border-brand-accent focus:outline-none sm:text-sm"
              />
            </label>
            <div role="group" aria-label="Temperatura" className="flex shrink-0 rounded-full border border-brand-border bg-brand-sand p-0.5">
              {TEMPERATURE_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={temperature === option.value}
                  onClick={() => setTemperature(option.value)}
                  className={`rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    temperature === option.value ? "bg-brand-primary text-brand-on-primary" : "text-brand-ink/75"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {visible.length > 1 && (
            <CategoryChips categories={visible} activeSlug={activeSlug} />
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10 sm:px-6">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-brand-ink/75">
              {query.trim() ? <>No encontramos nada con “{query.trim()}”.</> : "No hay productos con ese filtro."}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTemperature(null);
              }}
              className="rounded-full border border-brand-ink/30 px-4 py-2 text-sm font-semibold"
            >
              Ver todo el menú
            </button>
          </div>
        ) : (
          visible.map((category) => (
            <section key={category.id} id={`cat-${category.slug}`} data-category={category.slug} className="scroll-mt-36 pt-7">
              <h2 className="font-display text-xl font-semibold">{category.name}</h2>
              {category.description && !filtering && <p className="mt-0.5 text-sm text-brand-ink/70">{category.description}</p>}
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {category.products.map((product) => (
                  <li key={product.id}>
                    <ProductCard product={product} onOpen={() => openProduct(product)} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <footer className="border-t border-brand-border">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-5 text-xs text-brand-ink/70 sm:px-6">
          <p>Precios en pesos mexicanos.</p>
          <Link href="/" className="underline underline-offset-4">
            Inicio
          </Link>
        </div>
      </footer>

      {selected && <ProductSheet key={selected.id} product={selected} onClose={closeProduct} />}
    </main>
  );
}

function ProductCard({ product, onOpen }: { product: MenuProductView; onOpen: () => void }) {
  const soldOut = !product.is_available;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full gap-3 rounded-[14px] border border-brand-border bg-brand-sand/60 p-2.5 text-left transition-colors hover:border-brand-accent focus-visible:border-brand-accent focus-visible:outline-none"
    >
      <ProductPhoto product={product} decorative className={`h-24 w-24 shrink-0 rounded-[10px] ${soldOut ? "opacity-50 grayscale" : ""}`} sizes="96px" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-semibold leading-snug ${soldOut ? "text-brand-ink/60" : ""}`}>{product.name}</h3>
          <span className={`shrink-0 text-sm font-semibold tabular-nums ${soldOut ? "text-brand-stone" : "text-brand-accent"}`}>
            {product.priceLabel}
          </span>
        </div>
        {product.description && <p className="line-clamp-2 text-sm text-brand-ink/70">{product.description}</p>}
        <TagList tags={product.tags} soldOut={soldOut} className="mt-auto pt-1" />
      </div>
    </button>
  );
}

function CategoryChips({ categories, activeSlug }: { categories: MenuCategoryView[]; activeSlug: string | null }) {
  const listRef = useRef<HTMLUListElement>(null);

  // Mantiene visible el chip de la categoría en la que va el scroll.
  useEffect(() => {
    if (!activeSlug) return;
    const chip = listRef.current?.querySelector<HTMLElement>(`[data-chip="${activeSlug}"]`);
    chip?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeSlug]);

  return (
    <nav aria-label="Categorías">
      <ul ref={listRef} className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6">
        {categories.map((category) => (
          <li key={category.id} className="shrink-0">
            <a
              href={`#cat-${category.slug}`}
              data-chip={category.slug}
              aria-current={activeSlug === category.slug ? "true" : undefined}
              className={`block rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeSlug === category.slug
                  ? "bg-brand-ink text-brand-cream"
                  : "border border-brand-border text-brand-ink/80 hover:bg-brand-sand"
              }`}
            >
              {category.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Altura aproximada de la barra fija: una sección "está activa" cuando su título pasa por debajo. */
const STICKY_OFFSET_PX = 170;

/** La última categoría cuyo inicio ya pasó bajo la barra fija (la primera si aún no se hace scroll). */
function useActiveCategory(slugs: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = slugs.join(",");

  useEffect(() => {
    const ids = key.split(",").filter(Boolean);
    if (ids.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = ids[0];
      for (const slug of ids) {
        const section = document.getElementById(`cat-${slug}`);
        if (section && section.getBoundingClientRect().top <= STICKY_OFFSET_PX) current = slug;
      }
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [key]);

  return active;
}

/** "…7:00 p. m." ya termina en punto: no agregar otro. */
function endSentence(text: string): string {
  return text.endsWith(".") ? text : `${text}.`;
}

function SearchIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <circle cx="9" cy="9" r="6" />
      <path d="m14 14 4 4" strokeLinecap="round" />
    </svg>
  );
}
