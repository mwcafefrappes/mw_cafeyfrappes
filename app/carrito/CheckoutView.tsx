"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { distanceLabel, distanceMeters, type LatLng } from "@/lib/geo";
import { computeItemPrice } from "@/lib/item-price";
import { formatMXN } from "@/lib/money";
import { placeOrderAction } from "@/lib/order-actions";
import { dayLabel } from "@/lib/order-format";
import { mexicoDay, type ScheduleDay } from "@/lib/order-slots";
import { MAX_ADDRESS, MAX_NAME_LENGTH, MAX_ORDER_NOTE, MAX_QUANTITY, MAX_REFERENCES, orderTotals, type OrderKind, type OrderRules } from "@/lib/orders";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payment-methods";
import { formatTimeOfDay, type TimeFormat } from "@/lib/time-format";
import { clearCart, rememberOrder, removeLine, setLineQuantity, useCart, type CartLine } from "../cart-store";
import { useTableNumber } from "../menu/client-state";
import type { MenuProductView } from "../menu/types";

type ClientRules = Omit<OrderRules, "slotAvailable">;

/** Leaflet usa `window`: el mapa se carga solo en el navegador. */
const DeliveryMap = dynamic(() => import("./DeliveryMap"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-[14px] bg-brand-sand" aria-label="Cargando el mapa…" />,
});

const TYPE_LABELS: Record<OrderKind, string> = {
  table: "En mi mesa",
  pickup: "Para recoger en el mostrador",
  delivery: "A domicilio",
};

const inputClass =
  "w-full rounded-[12px] border border-brand-border bg-brand-sand px-3 py-2.5 text-base placeholder:text-brand-stone focus:border-brand-accent focus:outline-none sm:text-sm";
const choiceClass =
  "flex cursor-pointer items-center gap-3 rounded-[14px] border border-brand-border px-4 py-3 text-sm has-[:checked]:border-brand-primary has-[:checked]:bg-brand-accent-wash has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-accent";
const chipClass =
  "flex cursor-pointer items-center rounded-full border border-brand-border px-3.5 py-2 text-sm has-[:checked]:border-brand-ink has-[:checked]:bg-brand-ink has-[:checked]:text-brand-cream has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-accent";

const PAYMENT_HINTS: Record<PaymentMethod, string> = {
  cash: "Pagas al recibir tu pedido.",
  transfer: "Al confirmar verás los datos para transferir y podrás subir tu comprobante. Preparamos tu pedido en cuanto confirmemos el pago.",
  card: "Pagas en línea con tarjeta, Google Pay o Apple Pay.",
};

function lineDetails(line: CartLine, product: MenuProductView): string {
  const size = product.product_sizes.find((s) => s.id === line.sizeId)?.name;
  const extras = product.extra_groups.flatMap((g) => g.extras).filter((e) => line.extraIds.includes(e.id)).map((e) => e.name);
  return [size, ...extras].filter(Boolean).join(" · ");
}

export function CheckoutView({
  products,
  rules,
  days,
  timeFormat,
  serverNow,
  nextOpening,
}: {
  products: MenuProductView[];
  rules: ClientRules;
  days: ScheduleDay[];
  timeFormat: TimeFormat;
  serverNow: number;
  nextOpening: string | null;
}) {
  const router = useRouter();
  const cart = useCart();
  const table = useTableNumber();
  const byId = new Map(products.map((p) => [p.id, p]));

  const tableAvailable = rules.tableEnabled && table !== null && table <= rules.tableCount;
  const typeOptions: OrderKind[] = [
    ...(tableAvailable ? (["table"] as const) : []),
    ...(rules.pickupEnabled ? (["pickup"] as const) : []),
    ...(rules.deliveryEnabled ? (["delivery"] as const) : []),
  ];
  const [chosenType, setType] = useState<OrderKind | null>(null);
  const type = chosenType && typeOptions.includes(chosenType) ? chosenType : (typeOptions[0] ?? null);

  const canAsap = rules.openNow;
  const canSchedule = type !== null && type !== "table" && rules.scheduledEnabled && days.some((d) => d.slots.some((s) => !s.full));
  const [chosenWhen, setWhen] = useState<"asap" | "later" | null>(null);
  const when = type === "table" ? "asap" : chosenWhen === "later" && canSchedule ? "later" : canAsap ? "asap" : canSchedule ? "later" : null;

  const [chosenDay, setDay] = useState<string | null>(null);
  const day = days.find((d) => d.day === chosenDay) ?? days.find((d) => d.slots.some((s) => !s.full)) ?? null;
  const [slot, setSlot] = useState<string | null>(null);
  const slotValid = day?.slots.some((s) => s.startIso === slot && !s.full) ?? false;

  const methods = type ? rules.methods[type] : [];
  const [chosenMethod, setMethod] = useState<PaymentMethod | null>(null);
  const method = chosenMethod && methods.includes(chosenMethod) ? chosenMethod : (methods[0] ?? null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [references, setReferences] = useState("");
  const [point, setPoint] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const lines = cart.map((line) => {
    const product = byId.get(line.productId);
    const price = product ? computeItemPrice(product, line) : null;
    return { line, product, price };
  });
  const problems = lines.filter((l) => !l.product || !l.price?.ok);
  const subtotalCents = lines.reduce((sum, l) => sum + (l.price?.ok ? l.price.unitCents * l.line.quantity : 0), 0);
  const totals = type ? orderTotals(type, subtotalCents, rules) : null;
  const totalCents = totals?.ok ? totals.value.totalCents : subtotalCents;
  const isDelivery = type === "delivery";
  const store = rules.delivery.store;
  const distance = isDelivery && point && store ? distanceMeters(store, point) : null;
  const outsideZone = distance !== null && distance > rules.delivery.radiusM;

  const today = mexicoDay(new Date(serverNow));
  const blocked =
    typeOptions.length === 0
      ? "Por ahora no estamos tomando pedidos en línea."
      : when === null
        ? `Ahorita estamos cerrados${nextOpening ? `; abrimos ${nextOpening}` : ""}.`
        : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!type || !method || blocked) return;
    if (problems.length > 0) {
      setError("Quita o vuelve a agregar los productos marcados para continuar.");
      return;
    }
    if (when === "later" && !slotValid) {
      setError(isDelivery ? "Elige la hora a la que quieres recibir tu pedido." : "Elige la hora a la que pasas por tu pedido.");
      return;
    }
    if (totals && !totals.ok) {
      setError(totals.error);
      return;
    }
    if (isDelivery && !point) {
      setError("Mueve el mapa hasta que el pin quede donde te entregamos.");
      return;
    }
    if (outsideZone) {
      setError("Ese punto queda fuera de nuestra zona de entrega.");
      return;
    }
    startTransition(async () => {
      const result = await placeOrderAction({
        type,
        table: type === "table" ? table : null,
        scheduledFor: when === "later" ? slot : null,
        name,
        phone,
        delivery: isDelivery ? { address, references, point } : null,
        paymentMethod: method,
        note,
        items: cart.map(({ productId, sizeId, extraIds, quantity, note: itemNote }) => ({ productId, sizeId, extraIds, quantity, note: itemNote })),
      });
      if (!result.ok) {
        setError(result.error);
        router.refresh();
        return;
      }
      rememberOrder({ token: result.token, number: result.number, createdAt: Date.now() });
      clearCart();
      // Con tarjeta va directo a la página de pago de Stripe; si no se pudo abrir, a su pedido (ahí está "Pagar").
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else router.push(`/pedido/${result.token}`);
    });
  };

  return (
    <main className="flex flex-1 flex-col bg-brand-cream text-brand-ink">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">Tu pedido</h1>
          <Link href="/menu" className="text-sm font-medium underline underline-offset-4">
            Seguir viendo el menú
          </Link>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-[14px] border border-brand-border bg-brand-sand/60 p-5">
            <p className="text-sm">Todavía no agregas nada.</p>
            <Link href="/menu" className="rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-on-primary">
              Ver el menú
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-6">
            <ul className="flex flex-col divide-y divide-brand-border rounded-[14px] border border-brand-border">
              {lines.map(({ line, product, price }) => (
                <li key={line.key} className="flex flex-col gap-2 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{product?.name ?? "Producto que ya no está en el menú"}</p>
                      {product && lineDetails(line, product) && <p className="text-xs text-brand-ink/70">{lineDetails(line, product)}</p>}
                      {line.note && <p className="text-xs italic text-brand-ink/70">“{line.note}”</p>}
                      {(!product || !price?.ok) && (
                        <p className="mt-1 text-xs font-semibold text-red-700 dark:text-red-400">
                          {!product || (price && !price.ok && price.reason === "unavailable") ? "Ya no está disponible. Quítalo." : "Cambió en el menú. Quítalo y vuelve a agregarlo."}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">{price?.ok ? formatMXN(price.unitCents * line.quantity) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-brand-border">
                      <button type="button" onClick={() => setLineQuantity(line.key, line.quantity - 1)} aria-label="Uno menos" className="h-9 w-9 cursor-pointer">
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setLineQuantity(line.key, line.quantity + 1)}
                        disabled={line.quantity >= MAX_QUANTITY}
                        aria-label="Uno más"
                        className="h-9 w-9 cursor-pointer disabled:opacity-35"
                      >
                        +
                      </button>
                    </div>
                    <button type="button" onClick={() => removeLine(line.key)} className="cursor-pointer text-xs font-medium text-red-700 underline-offset-4 hover:underline dark:text-red-400">
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {blocked ? (
              <p role="status" className="rounded-[14px] bg-brand-accent-wash px-4 py-3 text-sm font-medium">
                {blocked}
              </p>
            ) : (
              <>
                {typeOptions.length > 1 && (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-sm font-semibold">¿Dónde lo quieres?</legend>
                    {typeOptions.map((option) => (
                      <label key={option} className={choiceClass}>
                        <input type="radio" name="type" checked={type === option} onChange={() => setType(option)} className="accent-[var(--brand-primary)]" />
                        {option === "table" ? `${TYPE_LABELS.table} (mesa ${table})` : TYPE_LABELS[option]}
                      </label>
                    ))}
                  </fieldset>
                )}
                {typeOptions.length === 1 && (
                  <p className="text-sm font-semibold">
                    {type === "table" ? `Te lo llevamos a la mesa ${table}.` : type === "delivery" ? "Te lo llevamos a domicilio." : "Para recoger en el mostrador."}
                  </p>
                )}

                {type !== "table" && (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-sm font-semibold">{isDelivery ? "¿Cuándo te lo llevamos?" : "¿Cuándo pasas por él?"}</legend>
                    {canAsap && (
                      <label className={choiceClass}>
                        <input type="radio" name="when" checked={when === "asap"} onChange={() => setWhen("asap")} className="accent-[var(--brand-primary)]" />
                        Lo antes posible
                      </label>
                    )}
                    {canSchedule && (
                      <label className={choiceClass}>
                        <input type="radio" name="when" checked={when === "later"} onChange={() => setWhen("later")} className="accent-[var(--brand-primary)]" />
                        Programar para más tarde u otro día
                      </label>
                    )}
                    {!canAsap && canSchedule && <p className="text-xs text-brand-ink/70">Ahorita estamos cerrados: puedes programarlo para cuando abramos.</p>}
                    {when === "later" && day && (
                      <div className="mt-2 flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Día">
                          {days
                            .filter((d) => d.slots.some((s) => !s.full))
                            .map((d) => (
                              <label key={d.day} className={chipClass}>
                                <input
                                  type="radio"
                                  name="day"
                                  checked={day.day === d.day}
                                  onChange={() => {
                                    setDay(d.day);
                                    setSlot(null);
                                  }}
                                  className="sr-only"
                                />
                                {dayLabel(d.day, today)}
                              </label>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Hora">
                          {day.slots.map((s) => (
                            <label key={s.startIso} className={chipClass} title={s.full ? "Ya no hay lugar a esta hora" : undefined}>
                              <input type="radio" name="slot" checked={slot === s.startIso} disabled={s.full} onChange={() => setSlot(s.startIso)} className="sr-only" />
                              <span className="tabular-nums">{formatTimeOfDay(s.minutes % (24 * 60), timeFormat)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </fieldset>
                )}

                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5 text-sm font-semibold">
                    Tu nombre
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_NAME_LENGTH} required autoComplete="given-name" className={inputClass} />
                  </label>
                  {type !== "table" && (
                    <label className="flex flex-col gap-1.5 text-sm font-semibold">
                      Tu teléfono
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="10 dígitos"
                        className={inputClass}
                      />
                      <span className="text-xs font-normal text-brand-ink/65">
                        {isDelivery ? "Para avisarte si no encontramos la dirección." : "Solo por si hay algún problema con tu pedido."}
                      </span>
                    </label>
                  )}
                </div>

                {isDelivery && store && (
                  <fieldset className="flex flex-col gap-3">
                    <legend className="mb-2 text-sm font-semibold">¿Dónde te lo entregamos?</legend>
                    <label className="flex flex-col gap-1.5 text-sm font-semibold">
                      Calle, número y colonia
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        maxLength={MAX_ADDRESS}
                        required
                        autoComplete="street-address"
                        placeholder="Ej. Bugambilia 204, Sector H"
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-semibold">
                      Referencias
                      <input
                        value={references}
                        onChange={(e) => setReferences(e.target.value)}
                        maxLength={MAX_REFERENCES}
                        placeholder="Opcional, ej. casa blanca con portón negro"
                        className={inputClass}
                      />
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-semibold">Marca tu casa en el mapa</p>
                      <p className="text-xs text-brand-ink/70">
                        Mueve el mapa hasta que el pin quede en la entrada. Repartimos hasta {distanceLabel(rules.delivery.radiusM)} alrededor del local (el círculo).
                      </p>
                      <DeliveryMap store={store} radiusM={rules.delivery.radiusM} point={point} onChange={setPoint} />
                      {distance !== null && (
                        <p role="status" className={`text-sm font-medium ${outsideZone ? "text-red-700 dark:text-red-400" : "text-green-800 dark:text-green-300"}`}>
                          {outsideZone
                            ? `Ese punto está a ${distanceLabel(distance)} del local, fuera de nuestra zona de entrega.`
                            : `Listo: ${distanceLabel(distance)} del local.`}
                        </p>
                      )}
                    </div>
                  </fieldset>
                )}

                {methods.length > 0 && (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-sm font-semibold">¿Cómo pagas?</legend>
                    {methods.map((option) => (
                      <label key={option} className={`${choiceClass} items-start`}>
                        <input type="radio" name="payment" checked={method === option} onChange={() => setMethod(option)} className="mt-0.5 accent-[var(--brand-primary)]" />
                        <span className="flex flex-col gap-0.5">
                          <span className="font-medium">{PAYMENT_METHOD_LABELS[option]}</span>
                          {method === option && (
                            <span className="text-xs text-brand-ink/70">
                              {option === "card" && isDelivery && rules.delivery.feeMode === "manual"
                                ? "Pagas en línea en cuanto te confirmemos el costo del envío."
                                : PAYMENT_HINTS[option]}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                )}

                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  Nota para el pedido <span className="sr-only">(opcional)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={MAX_ORDER_NOTE}
                    rows={2}
                    placeholder={isDelivery ? "Opcional, ej. tocar el timbre dos veces" : "Opcional, ej. llego en 10 minutos"}
                    className={inputClass}
                  />
                </label>
              </>
            )}

            <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-brand-border bg-brand-cream/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur sm:-mx-6 sm:px-6">
              {isDelivery && !blocked && (
                <dl className="flex flex-col gap-0.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-brand-ink/70">Productos</dt>
                    <dd className="tabular-nums">{formatMXN(subtotalCents)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-brand-ink/70">Envío</dt>
                    <dd className="text-right tabular-nums">
                      {rules.delivery.feeMode === "auto" ? formatMXN(rules.delivery.feeCents) : "Te lo confirmamos al recibir tu pedido"}
                    </dd>
                  </div>
                  {totals && !totals.ok && <p className="text-xs font-medium text-red-700 dark:text-red-400">{totals.error}</p>}
                </dl>
              )}
              {error && (
                <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={pending || Boolean(blocked) || !method}
                className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-full bg-brand-primary px-6 text-sm font-semibold text-brand-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>
                  {pending
                    ? "Enviando tu pedido…"
                    : method === "card" && !(isDelivery && rules.delivery.feeMode === "manual")
                      ? "Hacer pedido y pagar"
                      : "Hacer pedido"}
                </span>
                <span className="tabular-nums">{formatMXN(totalCents)}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
