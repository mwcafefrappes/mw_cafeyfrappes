/**
 * Reglas de pedidos (CLAUDE.md sección 5, decisiones del 2026-10-08).
 * Puro: lo usan el carrito, la acción que crea el pedido, /pedido/<token>,
 * /admin/pedidos y las pruebas.
 *
 * Nunca se confía en lo que manda el navegador: aquí se valida la forma,
 * las reglas del negocio y se recalcula cada precio con los datos de la BD.
 */

import { normalizeWhatsapp } from "./admin/business-form";
import { distanceLabel, distanceMeters, isLatLng, type LatLng } from "./geo";
import { computeItemPrice, type PricedProduct } from "./item-price";
import { MAX_TABLE_NUMBER } from "./menu";
import { formatMXN } from "./money";
import { normalizeIso } from "./order-slots";
import type { OrderType, PaymentMethod } from "./payment-methods";

// ---------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------

export const ORDER_STATUSES = ["received", "preparing", "ready", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = "pending" | "paid" | "refunded";
export type OrderKind = OrderType;
export type CancelledBy = "customer" | "staff" | "system";

/** Un pedido con tarjeta que no se paga en este tiempo se cancela solo (decisión 2026-10-09). */
export const UNPAID_CARD_MINUTES = 60;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Recibido",
  preparing: "Preparando",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pago pendiente",
  paid: "Pagado",
  refunded: "Reembolsado",
};

/** Lo mínimo de un pedido para decidir qué se puede hacer con él. */
export interface OrderState {
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received: "preparing",
  preparing: "ready",
  ready: "delivered",
};

export function isFinalStatus(status: OrderStatus): boolean {
  return status === "delivered" || status === "cancelled";
}

/** Lo que hace falta además para domicilio y tarjeta. */
export interface FullOrderState extends OrderState {
  type: string;
  delivery_fee_cents: number | null;
}

/**
 * Transferencia o tarjeta sin pagar: no se prepara (decisiones 2026-10-08 y
 * 2026-10-09). El efectivo se paga al recibir.
 */
export function isWaitingForPayment(order: OrderState): boolean {
  return order.status === "received" && order.payment_method !== "cash" && order.payment_status !== "paid";
}

/** Domicilio con envío manual: la tienda tiene que poner el costo antes de que el cliente pague. */
export function needsDeliveryFee(order: FullOrderState): boolean {
  return order.type === "delivery" && order.delivery_fee_cents === null && order.status === "received";
}

/** El cliente ya puede pagar con tarjeta desde /pedido/<token>. */
export function canPayOnline(order: FullOrderState): boolean {
  return order.payment_method === "card" && order.payment_status === "pending" && order.status === "received" && !needsDeliveryFee(order);
}

/** Siguiente estado para el botón del tablero; `null` si no hay o si falta confirmar el pago. */
export function nextStatus(order: OrderState): OrderStatus | null {
  if (isWaitingForPayment(order)) return null;
  return NEXT_STATUS[order.status] ?? null;
}

/** Valida un cambio de estado del personal. `null` = permitido; si no, el motivo. */
export function staffTransitionError(order: OrderState, to: OrderStatus): string | null {
  if (isFinalStatus(order.status)) return "Ese pedido ya está cerrado.";
  if (to === "cancelled") return null;
  if (NEXT_STATUS[order.status] !== to) return "Ese cambio de estado no es válido.";
  if (isWaitingForPayment(order)) {
    return order.payment_method === "card" ? "Este pedido todavía no se paga con tarjeta." : "Primero confirma que llegó la transferencia.";
  }
  return null;
}

/**
 * El cliente solo cancela mientras nadie lo ha empezado a preparar. Si ya
 * pagó con tarjeta, cancela el personal (para regresarle el dinero).
 */
export function canCustomerCancel(order: OrderState): boolean {
  return order.status === "received" && !(order.payment_method === "card" && order.payment_status === "paid");
}

/** El comprobante se puede subir (o cambiar) mientras el pago siga pendiente y el pedido abierto. */
export function canUploadProof(order: OrderState): boolean {
  return order.payment_method === "transfer" && order.payment_status === "pending" && !isFinalStatus(order.status);
}

// ---------------------------------------------------------------------
// Lo que manda el navegador
// ---------------------------------------------------------------------

export const MAX_CART_LINES = 30;
export const MAX_QUANTITY = 20;
export const MAX_NAME_LENGTH = 60;
export const MAX_ITEM_NOTE = 140;
export const MAX_ORDER_NOTE = 280;
export const MAX_ADDRESS = 160;
export const MAX_REFERENCES = 200;

export interface CartLineInput {
  productId: string;
  sizeId: string | null;
  extraIds: string[];
  quantity: number;
  note: string;
}

export interface DeliveryInput {
  /** Calle, número y colonia. */
  address: string;
  references: string;
  /** El pin que el cliente puso en el mapa. */
  point: LatLng;
}

export interface OrderRequest {
  type: OrderKind;
  table: number | null;
  /** `null` = lo antes posible; si no, el horario elegido (ISO). */
  scheduledFor: string | null;
  name: string;
  /** 52 + 10 dígitos, o `null` (mesa). */
  phone: string | null;
  /** Solo domicilio. */
  delivery: DeliveryInput | null;
  paymentMethod: PaymentMethod;
  note: string;
  items: CartLineInput[];
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function str(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** Revisa la forma del pedido (sin BD): tipos, largos, cantidades y teléfono. */
export function parseOrderRequest(raw: unknown): Result<OrderRequest> {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "No pudimos leer tu pedido. Recarga la página." };
  const input = raw as Record<string, unknown>;

  const type = input.type;
  if (type !== "pickup" && type !== "table" && type !== "delivery") return { ok: false, error: "Elige si es para recoger, para tu mesa o a domicilio." };

  let table: number | null = null;
  if (type === "table") {
    const value = Number(input.table);
    if (!Number.isInteger(value) || value < 1 || value > MAX_TABLE_NUMBER) {
      return { ok: false, error: "No sabemos en qué mesa estás. Escanea otra vez el QR de tu mesa." };
    }
    table = value;
  }

  let scheduledFor: string | null = null;
  if (input.scheduledFor !== null && input.scheduledFor !== undefined && input.scheduledFor !== "") {
    scheduledFor = typeof input.scheduledFor === "string" ? normalizeIso(input.scheduledFor) : null;
    if (!scheduledFor) {
      return { ok: false, error: type === "delivery" ? "Elige la hora a la que quieres recibir tu pedido." : "Elige la hora a la que pasas por tu pedido." };
    }
    if (type === "table") return { ok: false, error: "Los pedidos en mesa son para ahora." };
  }

  const name = str(input.name);
  if (!name) return { ok: false, error: "Escribe tu nombre para llamarte cuando esté listo." };
  if (name.length > MAX_NAME_LENGTH) return { ok: false, error: "Tu nombre es muy largo." };

  let phone: string | null = null;
  const phoneRaw = str(input.phone);
  if (type !== "table" || phoneRaw) {
    phone = normalizeWhatsapp(phoneRaw);
    if (!phone) return { ok: false, error: "Escribe tu teléfono a 10 dígitos." };
  }

  let delivery: DeliveryInput | null = null;
  if (type === "delivery") {
    const raw = typeof input.delivery === "object" && input.delivery !== null ? (input.delivery as Record<string, unknown>) : {};
    const address = str(raw.address);
    if (!address) return { ok: false, error: "Escribe la calle, el número y la colonia de entrega." };
    if (address.length > MAX_ADDRESS) return { ok: false, error: `La dirección puede tener máximo ${MAX_ADDRESS} letras.` };
    const references = str(raw.references);
    if (references.length > MAX_REFERENCES) return { ok: false, error: `Las referencias pueden tener máximo ${MAX_REFERENCES} letras.` };
    if (!isLatLng(raw.point)) return { ok: false, error: "Marca en el mapa dónde te lo entregamos." };
    delivery = { address, references, point: { lat: raw.point.lat, lng: raw.point.lng } };
  }

  const paymentMethod = input.paymentMethod;
  if (paymentMethod !== "cash" && paymentMethod !== "transfer" && paymentMethod !== "card") {
    return { ok: false, error: "Elige cómo vas a pagar." };
  }

  const note = str(input.note);
  if (note.length > MAX_ORDER_NOTE) return { ok: false, error: `La nota puede tener máximo ${MAX_ORDER_NOTE} letras.` };

  if (!Array.isArray(input.items) || input.items.length === 0) return { ok: false, error: "Tu pedido está vacío." };
  if (input.items.length > MAX_CART_LINES) return { ok: false, error: `Máximo ${MAX_CART_LINES} productos distintos por pedido.` };

  const items: CartLineInput[] = [];
  for (const rawItem of input.items) {
    if (typeof rawItem !== "object" || rawItem === null) return { ok: false, error: "Revisa los productos de tu pedido." };
    const item = rawItem as Record<string, unknown>;
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return { ok: false, error: `La cantidad de cada producto va de 1 a ${MAX_QUANTITY}.` };
    }
    const itemNote = str(item.note);
    if (itemNote.length > MAX_ITEM_NOTE) return { ok: false, error: `Las notas de producto pueden tener máximo ${MAX_ITEM_NOTE} letras.` };
    if (typeof item.productId !== "string" || !Array.isArray(item.extraIds) || !item.extraIds.every((id) => typeof id === "string")) {
      return { ok: false, error: "Revisa los productos de tu pedido." };
    }
    items.push({
      productId: item.productId,
      sizeId: typeof item.sizeId === "string" && item.sizeId ? item.sizeId : null,
      extraIds: item.extraIds as string[],
      quantity,
      note: itemNote,
    });
  }

  return { ok: true, value: { type, table, scheduledFor, name, phone, delivery, paymentMethod, note, items } };
}

// ---------------------------------------------------------------------
// Reglas del negocio
// ---------------------------------------------------------------------

export interface DeliveryRules {
  minSubtotalCents: number;
  feeCents: number;
  /** auto = siempre `feeCents`; manual = la tienda lo pone en cada pedido. */
  feeMode: "auto" | "manual";
  radiusM: number;
  /** Ubicación del local; sin ella no se puede medir la zona. */
  store: LatLng | null;
}

export interface OrderRules {
  pickupEnabled: boolean;
  tableEnabled: boolean;
  deliveryEnabled: boolean;
  delivery: DeliveryRules;
  scheduledEnabled: boolean;
  tableCount: number;
  /** Métodos que de verdad se ofrecen por tipo (`effectiveMethods`). */
  methods: Record<OrderKind, PaymentMethod[]>;
  openNow: boolean;
  /** El horario elegido existe y tiene lugar (`isSlotAvailable`). */
  slotAvailable: (iso: string) => boolean;
}

/** `null` si el pedido cumple las reglas; si no, el mensaje para el cliente. */
export function orderRulesError(request: OrderRequest, rules: OrderRules): string | null {
  if (request.type === "pickup" && !rules.pickupEnabled) return "Por ahora no estamos tomando pedidos para recoger.";
  if (request.type === "table" && !rules.tableEnabled) return "Por ahora no estamos tomando pedidos en mesa.";
  if (request.type === "delivery") {
    if (!rules.deliveryEnabled || !rules.delivery.store) return "Por ahora no estamos tomando pedidos a domicilio.";
    if (distanceMeters(rules.delivery.store, request.delivery!.point) > rules.delivery.radiusM) {
      return `Ese punto queda fuera de nuestra zona de entrega (${distanceLabel(rules.delivery.radiusM)} alrededor del local).`;
    }
  }
  if (request.type === "table" && request.table! > rules.tableCount) {
    return "No encontramos esa mesa. Escanea otra vez el QR de tu mesa.";
  }
  if (request.scheduledFor) {
    if (!rules.scheduledEnabled) return "Por ahora no estamos tomando pedidos programados.";
    if (!rules.slotAvailable(request.scheduledFor)) return "Esa hora ya no está disponible. Elige otra.";
  } else if (!rules.openNow) {
    return rules.scheduledEnabled && request.type !== "table"
      ? "Ahorita estamos cerrados: programa tu pedido para cuando abramos."
      : "Ahorita estamos cerrados.";
  }
  if (!rules.methods[request.type].includes(request.paymentMethod)) return "Ese método de pago no está disponible.";
  return null;
}

/**
 * Envío y total de un pedido. Domicilio: mínimo de subtotal y envío fijo
 * (automático) o `null` (manual: lo pone la tienda al recibirlo).
 */
export function orderTotals(type: OrderKind, subtotalCents: number, rules: Pick<OrderRules, "delivery">): Result<{ deliveryFeeCents: number | null; totalCents: number }> {
  if (type !== "delivery") return { ok: true, value: { deliveryFeeCents: null, totalCents: subtotalCents } };
  const { minSubtotalCents, feeCents, feeMode } = rules.delivery;
  if (subtotalCents < minSubtotalCents) return { ok: false, error: `El pedido mínimo a domicilio es de ${formatMXN(minSubtotalCents)} (sin el envío).` };
  const fee = feeMode === "auto" ? feeCents : null;
  return { ok: true, value: { deliveryFeeCents: fee, totalCents: subtotalCents + (fee ?? 0) } };
}

/** Con tarjeta, el pedido no sale en el tablero hasta pagarse; salvo si la tienda tiene que poner el envío. */
export function startsOnBoard(paymentMethod: PaymentMethod, deliveryFeeCents: number | null, type: OrderKind): boolean {
  return paymentMethod !== "card" || (type === "delivery" && deliveryFeeCents === null);
}

// ---------------------------------------------------------------------
// Precios (desde la BD)
// ---------------------------------------------------------------------

export interface PricingProduct extends PricedProduct {
  id: string;
  name: string;
  product_sizes: (PricedProduct["product_sizes"][number] & { name: string })[];
}

export interface PricedLine {
  productId: string;
  productName: string;
  sizeName: string | null;
  extras: { name: string; price_cents: number }[];
  unitCents: number;
  quantity: number;
  lineCents: number;
  note: string | null;
}

const PRICE_ERRORS: Record<string, (name: string, group?: string) => string> = {
  unavailable: (name) => `${name} se acaba de agotar. Quítalo de tu pedido para continuar.`,
  size_required: (name) => `Elige el tamaño de ${name}.`,
  unknown_size: (name) => `El tamaño de ${name} ya no existe. Vuelve a agregarlo.`,
  unknown_extra: (name) => `Un extra de ${name} ya no existe. Vuelve a agregarlo.`,
  extra_unavailable: (name) => `Un extra de ${name} se acaba de agotar. Vuelve a agregarlo.`,
  duplicate_extra: (name) => `Revisa los extras de ${name}.`,
  group_min: (name, group) => `Elige lo que falta en "${group}" de ${name}.`,
  group_max: (name, group) => `Elegiste de más en "${group}" de ${name}.`,
};

/** Recalcula cada renglón con los precios de la BD. Cualquier cosa rara = error con el nombre del producto. */
export function priceOrder(items: CartLineInput[], products: Map<string, PricingProduct>): Result<{ lines: PricedLine[]; subtotalCents: number }> {
  const lines: PricedLine[] = [];
  for (const item of items) {
    const product = products.get(item.productId);
    if (!product) return { ok: false, error: "Un producto de tu pedido ya no está en el menú. Quítalo para continuar." };
    const price = computeItemPrice(product, { sizeId: item.sizeId, extraIds: item.extraIds });
    if (!price.ok) return { ok: false, error: PRICE_ERRORS[price.reason](product.name, "groupName" in price ? price.groupName : undefined) };
    const extrasById = new Map(product.extra_groups.flatMap((g) => g.extras).map((e) => [e.id, e]));
    lines.push({
      productId: product.id,
      productName: product.name,
      sizeName: item.sizeId ? (product.product_sizes.find((s) => s.id === item.sizeId)?.name ?? null) : null,
      extras: item.extraIds.map((id) => ({ name: extrasById.get(id)!.name, price_cents: extrasById.get(id)!.price_cents })),
      unitCents: price.unitCents,
      quantity: item.quantity,
      lineCents: price.unitCents * item.quantity,
      note: item.note || null,
    });
  }
  return { ok: true, value: { lines, subtotalCents: lines.reduce((sum, line) => sum + line.lineCents, 0) } };
}
