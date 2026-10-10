"use client";

/**
 * Tablero en vivo de /admin/pedidos (CLAUDE.md 5.4). Escucha cambios de
 * `orders` con Supabase Realtime (la sesión del panel puede leer la tabla;
 * el público no) y vuelve a pedir la página; si aparece un pedido nuevo
 * (o uno con tarjeta que se acaba de pagar), suena. Cada 30 s se refresca
 * igual, por si la conexión en vivo se cae.
 */

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { AdminOrder } from "@/lib/admin/data";
import { setDeliveryFeeAction, setOrderStatusAction, setPaymentStatusAction, type BoardActionResult } from "@/lib/admin/order-actions";
import { distanceLabel, mapsPointUrl } from "@/lib/geo";
import { formatMXN } from "@/lib/money";
import { orderTypeLabel, phoneLabel, scheduledLabel } from "@/lib/order-format";
import { isWaitingForPayment, needsDeliveryFee, nextStatus, ORDER_STATUS_LABELS, type FullOrderState, type OrderStatus } from "@/lib/orders";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payment-methods";
import type { TimeFormat } from "@/lib/time-format";

/** Un programado aparece en "Nuevos" cuando falta menos de esto para su hora. */
const SCHEDULED_SOON_MS = 60 * 60_000;

const NEXT_LABELS: Partial<Record<OrderStatus, string>> = {
  preparing: "Empezar a preparar",
  ready: "Marcar listo",
  delivered: "Entregado",
};

function nextLabel(next: OrderStatus, type: string): string {
  return type === "delivery" && next === "ready" ? "Salió a entregar" : NEXT_LABELS[next]!;
}

function DeliveryFeeForm({ orderId, suggestedCents, onAction }: { orderId: string; suggestedCents: number; onAction: (run: () => Promise<BoardActionResult>) => void }) {
  const [pesos, setPesos] = useState(String(suggestedCents / 100));
  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-[10px] bg-brand-accent-wash p-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        onAction(() => setDeliveryFeeAction(orderId, pesos));
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Costo del envío
        <span className="flex items-center gap-1">
          $
          <input
            value={pesos}
            onChange={(e) => setPesos(e.target.value)}
            inputMode="decimal"
            required
            className="w-20 rounded-[8px] border border-brand-border bg-brand-cream px-2 py-1.5 text-sm"
          />
        </span>
      </label>
      <button type="submit" className="cursor-pointer rounded-full bg-brand-primary px-3.5 py-2 text-xs font-semibold text-brand-on-primary">
        Poner envío
      </button>
      <span className="w-full text-xs text-brand-ink/70">Al ponerlo, el cliente ve el total y ya puede pagar.</span>
    </form>
  );
}

/** Dos tonos cortos con WebAudio (sin archivos de sonido). */
function ding(context: AudioContext) {
  const now = context.currentTime;
  [880, 1320].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, now + index * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.35, now + index * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.18 + 0.3);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + index * 0.18);
    oscillator.stop(now + index * 0.18 + 0.32);
  });
}

function minutesAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "ahorita";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h ${minutes % 60} min`;
}

function OrderCard({
  order,
  now,
  timeFormat,
  defaultFeeCents,
  onAction,
}: {
  order: AdminOrder;
  now: number;
  timeFormat: TimeFormat;
  defaultFeeCents: number;
  onAction: (run: () => Promise<BoardActionResult>) => void;
}) {
  const state = order as FullOrderState;
  const feeMissing = needsDeliveryFee(state);
  const next = nextStatus(state);
  const waiting = isWaitingForPayment(state);
  const closed = order.status === "delivered" || order.status === "cancelled";
  const method = order.payment_method as PaymentMethod;

  return (
    <article
      className={`flex flex-col gap-3 rounded-[14px] border bg-brand-cream p-3.5 ${
        order.status === "received" && !closed ? "border-brand-primary shadow-[0_0_0_1px_var(--brand-primary)]" : "border-brand-border"
      } ${closed ? "opacity-70" : ""}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-2xl font-bold tabular-nums leading-none">#{order.number}</p>
          <p className="mt-1 text-sm font-semibold">
            {orderTypeLabel(order)} · {order.customer_name}
          </p>
          {order.customer_phone && (
            <a href={`https://wa.me/${order.customer_phone}`} className="text-xs text-brand-ink/70 underline-offset-4 hover:underline">
              {phoneLabel(order.customer_phone)}
            </a>
          )}
        </div>
        <div className="text-right text-xs">
          {order.scheduled_for ? (
            <span className="inline-block rounded-full bg-brand-accent-wash px-2 py-0.5 font-semibold">{scheduledLabel(order.scheduled_for, timeFormat, new Date(now))}</span>
          ) : (
            <span className="text-brand-ink/60">{minutesAgo(order.created_at, now)}</span>
          )}
          {closed && <p className="mt-1 font-semibold">{ORDER_STATUS_LABELS[order.status as OrderStatus]}</p>}
        </div>
      </header>

      {order.type === "delivery" && order.delivery_lat !== null && order.delivery_lng !== null && (
        <div className="flex flex-col gap-0.5 rounded-[10px] border border-brand-border px-2.5 py-2 text-sm">
          <p className="font-semibold">{order.delivery_address}</p>
          {order.delivery_references && <p className="text-xs text-brand-ink/75">{order.delivery_references}</p>}
          <p className="text-xs">
            <a
              href={mapsPointUrl({ lat: order.delivery_lat, lng: order.delivery_lng })}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline underline-offset-4"
            >
              Abrir en Maps
            </a>
            {order.delivery_distance_m !== null && <span className="text-brand-ink/70"> · {distanceLabel(order.delivery_distance_m)} del local</span>}
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-1.5 text-sm">
        {order.order_items.map((item) => {
          const extras = Array.isArray(item.extras) ? (item.extras as { name: string }[]).map((e) => e.name) : [];
          return (
            <li key={item.id}>
              <span className="font-semibold tabular-nums">{item.quantity} ×</span> {item.product_name}
              {item.size_name && <span className="text-brand-ink/70"> ({item.size_name})</span>}
              {extras.length > 0 && <span className="block pl-5 text-xs text-brand-ink/70">+ {extras.join(", ")}</span>}
              {item.note && <span className="block pl-5 text-xs font-semibold italic">“{item.note}”</span>}
            </li>
          );
        })}
      </ul>
      {order.note && <p className="rounded-[8px] bg-brand-sand px-2.5 py-1.5 text-xs">Nota: “{order.note}”</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-border pt-2.5 text-sm">
        <span className="font-semibold tabular-nums">
          {formatMXN(order.total_cents)}
          {order.type === "delivery" && (
            <span className="block text-xs font-normal text-brand-ink/70">
              {order.delivery_fee_cents === null ? "sin envío todavía" : `incluye ${formatMXN(order.delivery_fee_cents)} de envío`}
            </span>
          )}
        </span>
        <span className={`text-xs font-medium ${order.payment_status === "paid" ? "text-green-700 dark:text-green-400" : "text-amber-800 dark:text-amber-300"}`}>
          {PAYMENT_METHOD_LABELS[method]} · {order.payment_status === "paid" ? "pagado" : order.payment_status === "refunded" ? "reembolsado" : "sin pagar"}
        </span>
      </div>

      {method === "transfer" && order.payment_status !== "paid" && !closed && (
        <p className="text-xs">
          {order.proofUrl ? (
            <a href={order.proofUrl} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
              Ver comprobante
            </a>
          ) : (
            <span className="text-brand-ink/70">Todavía no sube su comprobante.</span>
          )}
          {waiting && <span className="block text-brand-ink/70">Revisa que llegó el dinero antes de prepararlo.</span>}
        </p>
      )}

      {feeMissing && <DeliveryFeeForm orderId={order.id} suggestedCents={defaultFeeCents} onAction={onAction} />}
      {method === "card" && waiting && !feeMissing && !closed && <p className="text-xs text-brand-ink/70">Esperando a que el cliente pague con tarjeta.</p>}

      {!closed && (
        <div className="flex flex-wrap gap-2">
          {order.payment_status !== "paid" && method !== "card" && (
            <button
              type="button"
              onClick={() => onAction(() => setPaymentStatusAction(order.id, true))}
              className={`cursor-pointer rounded-full px-3.5 py-2 text-xs font-semibold ${waiting ? "bg-brand-primary text-brand-on-primary" : "border border-brand-ink/25"}`}
            >
              {method === "transfer" ? "Ya llegó la transferencia" : "Marcar pagado"}
            </button>
          )}
          {next && (
            <button
              type="button"
              onClick={() => onAction(() => setOrderStatusAction(order.id, next))}
              className="cursor-pointer rounded-full bg-brand-primary px-3.5 py-2 text-xs font-semibold text-brand-on-primary"
            >
              {nextLabel(next, order.type)}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const refund = method === "card" && order.payment_status === "paid";
              const message = refund
                ? `¿Cancelar el pedido #${order.number}? Se le regresan ${formatMXN(order.total_cents)} a su tarjeta.`
                : `¿Cancelar el pedido #${order.number}?`;
              if (window.confirm(message)) onAction(() => setOrderStatusAction(order.id, "cancelled"));
            }}
            className="ml-auto cursor-pointer rounded-full px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-600/10 dark:text-red-400"
          >
            Cancelar
          </button>
        </div>
      )}
      {order.status === "delivered" && order.payment_status !== "paid" && method !== "card" && (
        <button type="button" onClick={() => onAction(() => setPaymentStatusAction(order.id, true))} className="cursor-pointer self-start text-xs font-semibold underline underline-offset-4">
          Marcar pagado
        </button>
      )}
    </article>
  );
}

function Column({ title, orders, empty, ...card }: { title: string; orders: AdminOrder[]; empty: string } & Omit<Parameters<typeof OrderCard>[0], "order">) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        {title}
        <span className="rounded-full bg-brand-sand px-2 py-0.5 font-sans text-xs font-semibold tabular-nums">{orders.length}</span>
      </h2>
      {orders.length === 0 ? <p className="text-sm text-brand-ink/60">{empty}</p> : orders.map((order) => <OrderCard key={order.id} order={order} {...card} />)}
    </section>
  );
}

export function OrdersBoard({
  orders,
  timeFormat,
  defaultFeeCents,
  serverNow,
  supabaseUrl,
  supabaseAnonKey,
}: {
  orders: AdminOrder[];
  timeFormat: TimeFormat;
  defaultFeeCents: number;
  serverNow: number;
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(false);
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  // Suena cuando aparece en el tablero un pedido que no estaba: uno nuevo, o uno con
  // tarjeta que se acaba de pagar (antes no se mostraba).
  const seenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(orders.filter((o) => o.status === "received").map((o) => o.id));
    const seen = seenRef.current;
    if (seen && soundOnRef.current && audioRef.current && [...ids].some((id) => !seen.has(id))) ding(audioRef.current);
    seenRef.current = new Set([...(seen ?? []), ...ids]);
  }, [orders]);

  // Reloj para "hace 5 min" y para mover los programados a "Nuevos".
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Tiempo real + respaldo cada 30 s.
  useEffect(() => {
    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
    const channel = supabase
      .channel("orders-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => router.refresh())
      .subscribe((status) => setLive(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED" ? "offline" : "connecting"));
    const fallback = setInterval(() => router.refresh(), 30_000);
    return () => {
      clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [router, supabaseUrl, supabaseAnonKey]);

  const toggleSound = () => {
    if (soundOn) {
      setSoundOn(false);
      return;
    }
    // El navegador solo deja sonar después de un toque en la página: aquí se "desbloquea" el audio
    // (por eso hay que activarlo cada vez que se abre el tablero).
    audioRef.current ??= new AudioContext();
    void audioRef.current.resume();
    ding(audioRef.current);
    setSoundOn(true);
  };

  const runAction = (run: () => Promise<BoardActionResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  };

  const soon = (order: AdminOrder) => !order.scheduled_for || Date.parse(order.scheduled_for) - now <= SCHEDULED_SOON_MS;
  const byTime = (a: AdminOrder, b: AdminOrder) => Date.parse(a.scheduled_for ?? a.created_at) - Date.parse(b.scheduled_for ?? b.created_at);
  const received = orders.filter((o) => o.status === "received" && soon(o)).sort(byTime);
  const later = orders.filter((o) => o.status === "received" && !soon(o)).sort(byTime);
  const preparing = orders.filter((o) => o.status === "preparing").sort(byTime);
  const ready = orders.filter((o) => o.status === "ready").sort(byTime);
  const closed = orders.filter((o) => o.status === "delivered" || o.status === "cancelled").sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  const card = { now, timeFormat, defaultFeeCents, onAction: runAction };

  return (
    <div className={`flex flex-col gap-6 ${pending ? "cursor-progress" : ""}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Pedidos</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-brand-ink/70">
            <span aria-hidden className={`h-2 w-2 rounded-full ${live === "live" ? "bg-green-600" : live === "offline" ? "bg-red-600" : "bg-brand-stone"}`} />
            {live === "live" ? "En vivo: los pedidos nuevos aparecen solos." : live === "offline" ? "Sin conexión en vivo; se actualiza cada 30 segundos." : "Conectando…"}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ${soundOn ? "bg-brand-primary text-brand-on-primary" : "border border-brand-ink/25"}`}
        >
          {soundOn ? "🔔 Sonido activado" : "🔕 Activar sonido"}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-[12px] bg-red-600/10 px-4 py-3 text-sm font-medium text-red-800 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Column title="Nuevos" orders={received} empty="Sin pedidos nuevos." {...card} />
        <Column title="Preparando" orders={preparing} empty="Nada en preparación." {...card} />
        <Column title="Listos" orders={ready} empty="Nada esperando entrega." {...card} />
      </div>

      {later.length > 0 && <Column title="Programados para más tarde" orders={later} empty="" {...card} />}

      {closed.length > 0 && (
        <details className="rounded-[14px] border border-brand-border p-4">
          <summary className="cursor-pointer text-sm font-semibold">Entregados y cancelados hoy ({closed.length})</summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {closed.map((order) => (
              <OrderCard key={order.id} order={order} {...card} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
