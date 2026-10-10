"use client";

import Link from "next/link";
import { computeItemPrice, type PricedProduct } from "@/lib/item-price";
import { formatMXN } from "@/lib/money";
import { recentOnly, useCart, useRecentOrders } from "../cart-store";

/** Cuántas piezas y cuánto va (con los precios actuales del menú; el servidor recalcula al pedir). */
export function cartSummary(cart: { productId: string; sizeId: string | null; extraIds: string[]; quantity: number }[], products: Map<string, PricedProduct>) {
  let count = 0;
  let totalCents = 0;
  for (const line of cart) {
    const product = products.get(line.productId);
    if (!product) continue;
    const price = computeItemPrice(product, line);
    count += line.quantity;
    if (price.ok) totalCents += price.unitCents * line.quantity;
  }
  return { count, totalCents };
}

/** Barra fija abajo: "Ver mi pedido · 3 · $210". Solo aparece con algo en el carrito. */
export function CartBar({ products }: { products: Map<string, PricedProduct> }) {
  const cart = useCart();
  const { count, totalCents } = cartSummary(cart, products);
  if (count === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
      <Link
        href="/carrito"
        className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-full bg-brand-primary px-5 py-3.5 text-sm font-semibold text-brand-on-primary shadow-[0_10px_30px_-10px_rgb(0_0_0/0.5)] transition-opacity hover:opacity-95"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-on-primary px-1.5 text-xs font-bold tabular-nums text-brand-primary">{count}</span>
          Ver mi pedido
        </span>
        <span className="tabular-nums">{formatMXN(totalCents)}</span>
      </Link>
    </div>
  );
}

/** "Tu pedido #12 →" si hizo un pedido hace poco (para volver a ver su estado). */
export function RecentOrderLink({ now }: { now: number }) {
  const orders = recentOnly(useRecentOrders(), now);
  if (orders.length === 0) return null;
  const latest = orders[0];
  return (
    <Link
      href={`/pedido/${latest.token}`}
      className="flex items-center justify-between gap-3 rounded-[14px] border border-brand-border bg-brand-sand px-4 py-3 text-sm font-medium hover:border-brand-accent"
    >
      <span>
        Tu pedido <span className="font-semibold">#{latest.number}</span>: ver cómo va
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}
