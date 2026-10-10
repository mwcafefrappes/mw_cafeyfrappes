"use client";

import { useEffect, useRef, useState } from "react";
import { computeItemPrice, extraGroupHint, type PricedExtraGroup } from "@/lib/item-price";
import { formatMXN } from "@/lib/money";
import { MAX_ITEM_NOTE, MAX_QUANTITY } from "@/lib/orders";
import { addToCart } from "../cart-store";
import { ModelViewer3D } from "../ModelViewer3D";
import { ProductPhoto, TagList } from "./ProductBits";
import type { MenuProductView } from "./types";

/**
 * Detalle de un producto: hoja que sube desde abajo en el celular y
 * ventana centrada en pantallas grandes (`<dialog>` nativo: Esc, foco y
 * fondo inerte gratis). El cliente elige tamaño, extras, cantidad y una
 * nota, y lo agrega a su pedido (`cart-store.ts`).
 */
export function ProductSheet({
  product,
  canOrder,
  onClose,
  onAdded,
}: {
  product: MenuProductView;
  /** `false` si el negocio no está tomando pedidos (recoger y mesa apagados). */
  canOrder: boolean;
  onClose: () => void;
  onAdded: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sizeId, setSizeId] = useState<string | null>(product.product_sizes[0]?.id ?? null);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [show3d, setShow3d] = useState(false);
  const soldOut = !product.is_available;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const toggleExtra = (group: PricedExtraGroup, extraId: string) => {
    setExtraIds((previous) => {
      if (previous.includes(extraId)) return previous.filter((id) => id !== extraId);
      const inGroup = previous.filter((id) => group.extras.some((extra) => extra.id === id));
      // Grupo de "elige 1": la nueva opción reemplaza a la anterior.
      if (group.max_select === 1) return [...previous.filter((id) => !inGroup.includes(id)), extraId];
      if (group.max_select !== null && inGroup.length >= group.max_select) return previous;
      return [...previous, extraId];
    });
  };

  const sizePrice = product.product_sizes.find((s) => s.id === sizeId)?.price_cents ?? product.base_price_cents;
  const extrasPrice = product.extra_groups
    .flatMap((group) => group.extras)
    .filter((extra) => extraIds.includes(extra.id))
    .reduce((sum, extra) => sum + extra.price_cents, 0);
  const result = computeItemPrice(product, { sizeId, extraIds });
  const missingGroup = !result.ok && result.reason === "group_min" ? result.groupName : null;

  const add = () => {
    if (!result.ok) return;
    const added = addToCart({ productId: product.id, sizeId, extraIds, quantity, note: note.trim() });
    onAdded(added ? `${quantity > 1 ? `${quantity} × ` : ""}${product.name} en tu pedido.` : "Tu pedido ya tiene demasiados productos distintos.");
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        // Clic en el fondo oscuro (fuera de la hoja) cierra.
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
      aria-labelledby="product-sheet-title"
      className="mx-0 mb-0 mt-auto h-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[22px] bg-brand-cream p-0 text-brand-ink backdrop:bg-black/55 sm:m-auto sm:max-h-[88dvh] sm:max-w-lg sm:rounded-[22px]"
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="overflow-y-auto overscroll-contain">
          <div className="relative">
            {show3d && product.modelUrl ? (
              <ModelViewer3D src={product.modelUrl} iosSrc={product.modelIosUrl} poster={product.photoUrl} alt={`${product.name} en 3D`} className="aspect-[4/3] w-full" />
            ) : (
              <ProductPhoto product={product} className={`aspect-[4/3] w-full ${soldOut ? "opacity-60 grayscale" : ""}`} sizes="(min-width: 640px) 512px, 100vw" />
            )}
            {product.modelUrl && (
              <button
                type="button"
                onClick={() => setShow3d((value) => !value)}
                aria-pressed={show3d}
                className="absolute left-3 top-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-brand-cream/90 px-3 py-1.5 text-sm font-semibold text-brand-ink shadow-sm"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                  <path d="M10 2.5 3.5 6v8L10 17.5 16.5 14V6L10 2.5Z M3.5 6 10 9.5 16.5 6 M10 9.5v8" strokeLinejoin="round" />
                </svg>
                {show3d ? "Ver foto" : "Ver en 3D"}
              </button>
            )}
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-cream/90 text-brand-ink shadow-sm"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
                <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-5 px-5 pb-6 pt-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <h2 id="product-sheet-title" className="font-display text-2xl font-bold leading-tight">
                  {product.name}
                </h2>
                <span className="shrink-0 pt-1 font-semibold tabular-nums text-brand-accent">{product.priceLabel}</span>
              </div>
              {product.description && <p className="text-sm text-brand-ink/75">{product.description}</p>}
              <TagList tags={product.tags} soldOut={soldOut} />
            </div>

            {!soldOut && product.product_sizes.length > 0 && (
              <fieldset>
                <legend className="text-sm font-semibold">Tamaño</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.product_sizes.map((size) => (
                    <label
                      key={size.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-accent ${
                        sizeId === size.id ? "border-brand-ink bg-brand-ink text-brand-cream" : "border-brand-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name="size"
                        value={size.id}
                        checked={sizeId === size.id}
                        onChange={() => setSizeId(size.id)}
                        className="sr-only"
                      />
                      <span className="font-medium">{size.name}</span>
                      <span className="tabular-nums opacity-80">{formatMXN(size.price_cents)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {!soldOut &&
              product.extra_groups.map((group) => {
                const chosen = group.extras.filter((extra) => extraIds.includes(extra.id)).length;
                const full = group.max_select !== null && group.max_select > 1 && chosen >= group.max_select;
                return (
                  <fieldset key={group.id}>
                    <legend className="flex w-full items-baseline justify-between gap-3 text-sm">
                      <span className="font-semibold">{group.name}</span>
                      <span className="text-xs text-brand-ink/65">{extraGroupHint(group.min_select, group.max_select)}</span>
                    </legend>
                    <ul className="mt-2 divide-y divide-brand-border rounded-[14px] border border-brand-border">
                      {group.extras.map((extra) => {
                        const checked = extraIds.includes(extra.id);
                        const disabled = !extra.is_available || (!checked && full);
                        return (
                          <li key={extra.id}>
                            <label
                              className={`flex items-center gap-3 px-3.5 py-2.5 text-sm ${disabled ? "opacity-50" : "cursor-pointer"}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => toggleExtra(group, extra.id)}
                                className="h-4 w-4 accent-[var(--brand-accent)]"
                              />
                              <span className="flex-1">
                                {extra.name}
                                {!extra.is_available && <span className="text-brand-ink/60"> · agotado</span>}
                              </span>
                              <span className="tabular-nums text-brand-ink/75">
                                {extra.price_cents > 0 ? `+${formatMXN(extra.price_cents)}` : "Sin costo"}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                );
              })}

            {!soldOut && canOrder && (
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Nota para este producto <span className="sr-only">(opcional)</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={MAX_ITEM_NOTE}
                  placeholder="Opcional, ej. poco hielo"
                  className="w-full rounded-[12px] border border-brand-border bg-brand-sand px-3 py-2 text-base font-normal placeholder:text-brand-stone focus:border-brand-accent focus:outline-none sm:text-sm"
                />
              </label>
            )}
          </div>
        </div>

        <div className="border-t border-brand-border bg-brand-cream px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3">
          {soldOut ? (
            <p className="py-2 text-center text-sm font-semibold text-brand-ink/70">Agotado por ahora</p>
          ) : !canOrder ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xl font-bold tabular-nums">{formatMXN(sizePrice + extrasPrice)}</p>
              <p className="max-w-[12rem] text-right text-xs text-brand-ink/65">Por ahora no estamos tomando pedidos en línea.</p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 items-center rounded-full border border-brand-border">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Uno menos"
                  className="h-11 w-11 cursor-pointer text-lg disabled:opacity-35"
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold tabular-nums" aria-label="Cantidad">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                  disabled={quantity >= MAX_QUANTITY}
                  aria-label="Uno más"
                  className="h-11 w-11 cursor-pointer text-lg disabled:opacity-35"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={add}
                disabled={!result.ok}
                className="flex min-h-11 flex-1 cursor-pointer items-center justify-between gap-2 rounded-full bg-brand-primary px-5 text-sm font-semibold text-brand-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{missingGroup ? `Elige: ${missingGroup}` : "Agregar"}</span>
                <span className="tabular-nums">{formatMXN((sizePrice + extrasPrice) * quantity)}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
