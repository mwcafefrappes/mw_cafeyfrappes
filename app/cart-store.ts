"use client";

/**
 * Carrito y "mis pedidos" del cliente, en `localStorage` (sin cuenta).
 * Con `useSyncExternalStore`: el servidor renderiza vacío y el navegador
 * pone lo guardado al hidratar. Solo guarda lo que eligió el cliente
 * (producto, tamaño, extras, cantidad, nota); los precios se vuelven a
 * calcular siempre, y el servidor los recalcula al pedir.
 */

import { useSyncExternalStore } from "react";
import { MAX_CART_LINES, MAX_QUANTITY, type CartLineInput } from "@/lib/orders";

const CART_KEY = "mw-cart";
const ORDERS_KEY = "mw-orders";
const CHANGE_EVENT = "mw:cart";
/** Un pedido se recuerda en el menú este tiempo después de hacerlo. */
const RECENT_ORDER_MS = 12 * 60 * 60_000;

export interface CartLine extends CartLineInput {
  /** Id local del renglón (para editar o quitar). */
  key: string;
}

export interface RecentOrder {
  token: string;
  number: number;
  createdAt: number;
}

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Modo privado o almacenamiento lleno: el carrito dura mientras la página esté abierta.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_KEY || event.key === ORDERS_KEY) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

// `useSyncExternalStore` necesita la misma referencia mientras no cambie el texto guardado.
const cache = new Map<string, { raw: string; value: unknown[] }>();
const EMPTY: never[] = [];

function snapshot<T>(key: string): T[] {
  const raw = read(key);
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value as T[];
  let value: unknown[];
  try {
    const parsed = JSON.parse(raw);
    value = Array.isArray(parsed) ? parsed : [];
  } catch {
    value = [];
  }
  cache.set(key, { raw, value });
  return value as T[];
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, () => snapshot<CartLine>(CART_KEY), () => EMPTY);
}

function sameChoice(a: CartLineInput, b: CartLineInput): boolean {
  return a.productId === b.productId && a.sizeId === b.sizeId && a.note === b.note && [...a.extraIds].sort().join() === [...b.extraIds].sort().join();
}

/** Agrega al carrito; si ya está lo mismo (tamaño, extras y nota), suma la cantidad. */
export function addToCart(line: CartLineInput): boolean {
  const cart = snapshot<CartLine>(CART_KEY);
  const existing = cart.find((item) => sameChoice(item, line));
  if (existing) {
    write(
      CART_KEY,
      cart.map((item) => (item === existing ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + line.quantity) } : item))
    );
    return true;
  }
  if (cart.length >= MAX_CART_LINES) return false;
  write(CART_KEY, [...cart, { ...line, key: crypto.randomUUID() }]);
  return true;
}

export function setLineQuantity(key: string, quantity: number) {
  const cart = snapshot<CartLine>(CART_KEY);
  write(
    CART_KEY,
    quantity <= 0 ? cart.filter((item) => item.key !== key) : cart.map((item) => (item.key === key ? { ...item, quantity: Math.min(MAX_QUANTITY, quantity) } : item))
  );
}

export function removeLine(key: string) {
  setLineQuantity(key, 0);
}

export function clearCart() {
  write(CART_KEY, []);
}

export function useRecentOrders(): RecentOrder[] {
  return useSyncExternalStore(subscribe, () => snapshot<RecentOrder>(ORDERS_KEY), () => EMPTY);
}

/** Pedidos de las últimas horas (para mostrar "Tu pedido #12" en el menú). */
export function recentOnly(orders: RecentOrder[], now: number): RecentOrder[] {
  return orders.filter((order) => now - order.createdAt < RECENT_ORDER_MS);
}

export function rememberOrder(order: RecentOrder) {
  const orders = snapshot<RecentOrder>(ORDERS_KEY).filter((o) => o.token !== order.token && Date.now() - o.createdAt < RECENT_ORDER_MS);
  write(ORDERS_KEY, [order, ...orders].slice(0, 5));
}
