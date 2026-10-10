import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { business } from "@/lib/config/business";
import { formatMXN } from "@/lib/money";
import { cancelOrderAction, startCardPaymentAction } from "@/lib/order-actions";
import { orderTypeLabel, scheduledLabel } from "@/lib/order-format";
import { expireUnpaidOrders, getOrderByToken } from "@/lib/order-server";
import {
  canCustomerCancel,
  canPayOnline,
  canUploadProof,
  isFinalStatus,
  isWaitingForPayment,
  needsDeliveryFee,
  UNPAID_CARD_MINUTES,
  type FullOrderState,
  type OrderStatus,
} from "@/lib/orders";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payment-methods";
import { getPublicBusinessSettings } from "@/lib/public-data";
import { getSiteAssetUrl } from "@/lib/storage";
import { parseTimeFormat } from "@/lib/time-format";
import { ConfirmSubmit } from "../../admin/(dashboard)/ConfirmSubmit";
import { CopyButton } from "../../CopyButton";
import { InstallPrompt } from "../../InstallPrompt";
import { AutoRefresh } from "./AutoRefresh";
import { ProofUploader } from "./ProofUploader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Tu pedido · ${business.name}`,
  robots: { index: false, follow: false },
};

const STEPS: OrderStatus[] = ["received", "preparing", "ready", "delivered"];

function stepLabel(status: OrderStatus, type: string): string {
  switch (status) {
    case "received":
      return "Recibido";
    case "preparing":
      return "Preparando";
    case "ready":
      return type === "table" ? "Va a tu mesa" : type === "delivery" ? "En camino" : "Listo para recoger";
    default:
      return "Entregado";
  }
}

function headline(order: FullOrderState & { scheduled_for: string | null; cancelled_by: string | null }): string {
  if (order.status === "cancelled") {
    if (order.payment_status === "refunded") return "Este pedido se canceló; te regresamos el dinero a tu tarjeta.";
    return order.cancelled_by === "system" ? "Este pedido se canceló porque no se pagó a tiempo." : "Este pedido se canceló.";
  }
  if (needsDeliveryFee(order)) return "Recibimos tu pedido; en un momento te decimos el costo del envío.";
  if (isWaitingForPayment(order)) return order.payment_method === "card" ? "Falta pagar tu pedido." : "Esperando tu transferencia.";
  switch (order.status) {
    case "received":
      return order.scheduled_for ? "Recibimos tu pedido programado." : "Recibimos tu pedido; en un momento lo empezamos.";
    case "preparing":
      return "Estamos preparando tu pedido.";
    case "ready":
      return order.type === "table" ? "¡Listo! Ya va a tu mesa." : order.type === "delivery" ? "¡Va en camino!" : "¡Listo! Pasa por él al mostrador.";
    default:
      return "Entregado. ¡Buen provecho!";
  }
}

export default async function OrderPage({ params, searchParams }: PageProps<"/pedido/[token]">) {
  const { token } = await params;
  const notice = await searchParams;
  await expireUnpaidOrders(new Date());
  const [order, settings] = await Promise.all([getOrderByToken(token), getPublicBusinessSettings()]);
  if (!order) notFound();

  const state = order as FullOrderState;
  const timeFormat = parseTimeFormat(settings.time_format);
  const now = new Date();
  const currentStep = STEPS.indexOf(order.status as OrderStatus);
  const whatsappUrl = settings.business_whatsapp
    ? `https://wa.me/${settings.business_whatsapp}?text=${encodeURIComponent(`Hola, es sobre mi pedido #${order.number}`)}`
    : null;
  const saved = typeof notice.saved === "string" ? notice.saved : null;
  const error = typeof notice.error === "string" ? notice.error : null;
  // Regresó de Stripe, pero el aviso de pago (webhook) puede tardar unos segundos.
  const confirmingPayment = notice.pagado === "1" && canPayOnline(state);

  return (
    <main className="flex flex-1 flex-col bg-brand-cream text-brand-ink">
      {!isFinalStatus(order.status as OrderStatus) && <AutoRefresh seconds={10} />}
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/menu" className="text-sm font-medium underline underline-offset-4">
            ← Menú
          </Link>
          <span className="text-xs text-brand-ink/60">{business.name}</span>
        </div>

        {(saved || error) && (
          <p
            role={error ? "alert" : "status"}
            className={`rounded-[14px] px-4 py-3 text-sm font-medium ${error ? "bg-red-600/10 text-red-800 dark:text-red-300" : "bg-green-600/10 text-green-900 dark:text-green-300"}`}
          >
            {error ?? saved}
          </p>
        )}

        <section className="flex flex-col gap-1">
          <p className="text-sm text-brand-ink/70">
            {orderTypeLabel(order)}
            {order.scheduled_for ? ` · ${scheduledLabel(order.scheduled_for, timeFormat, now)}` : ""}
          </p>
          <h1 className="font-display text-5xl font-bold tabular-nums">Pedido #{order.number}</h1>
          <p className="mt-1 text-lg font-semibold">{headline({ ...state, scheduled_for: order.scheduled_for, cancelled_by: order.cancelled_by })}</p>
          {order.type === "pickup" && order.status !== "cancelled" && (
            <p className="text-sm text-brand-ink/70">Di tu número de pedido y tu nombre ({order.customer_name}) en el mostrador.</p>
          )}
        </section>

        {order.status !== "cancelled" && (
          <ol className="grid grid-cols-4 gap-1.5" aria-label="Estado del pedido">
            {STEPS.map((step, index) => (
              <li key={step} className="flex flex-col gap-1.5" aria-current={index === currentStep ? "step" : undefined}>
                <span className={`h-1.5 rounded-full ${index <= currentStep ? "bg-brand-primary" : "bg-brand-border"}`} />
                <span className={`text-[11px] leading-tight ${index === currentStep ? "font-semibold" : "text-brand-ink/60"}`}>{stepLabel(step, order.type)}</span>
              </li>
            ))}
          </ol>
        )}

        {confirmingPayment && (
          <section role="status" className="flex flex-col gap-2 rounded-[14px] border border-brand-border bg-brand-sand/60 p-4">
            <h2 className="font-semibold">Estamos confirmando tu pago…</h2>
            <p className="text-sm text-brand-ink/75">Tarda unos segundos; esta página se actualiza sola.</p>
            <form action={startCardPaymentAction}>
              <input type="hidden" name="token" value={order.token} />
              <button type="submit" className="cursor-pointer text-sm font-semibold underline underline-offset-4">
                ¿No se completó? Volver a la página de pago
              </button>
            </form>
          </section>
        )}

        {canPayOnline(state) && !confirmingPayment && (
          <section className="flex flex-col gap-3 rounded-[14px] border border-brand-border bg-brand-sand/60 p-4">
            <h2 className="font-semibold">Paga {formatMXN(order.total_cents)} con tarjeta</h2>
            <p className="text-sm text-brand-ink/75">
              Puedes usar tarjeta de débito o crédito, Google Pay o Apple Pay. Empezamos a preparar tu pedido en cuanto se confirme el pago.
            </p>
            <form action={startCardPaymentAction}>
              <input type="hidden" name="token" value={order.token} />
              <button type="submit" className="min-h-12 w-full cursor-pointer rounded-full bg-brand-primary px-6 text-sm font-semibold text-brand-on-primary hover:opacity-90">
                Pagar {formatMXN(order.total_cents)}
              </button>
            </form>
            {!order.on_board && <p className="text-xs text-brand-ink/60">Si no se paga en {UNPAID_CARD_MINUTES} minutos, el pedido se cancela solo.</p>}
          </section>
        )}

        {order.type === "delivery" && order.delivery_address && (
          <section className="flex flex-col gap-1 text-sm">
            <h2 className="font-semibold">Entregar en</h2>
            <p>{order.delivery_address}</p>
            {order.delivery_references && <p className="text-brand-ink/70">{order.delivery_references}</p>}
          </section>
        )}

        {order.payment_method === "transfer" && order.status !== "cancelled" && (
          <section className="flex flex-col gap-3 rounded-[14px] border border-brand-border bg-brand-sand/60 p-4">
            <h2 className="font-semibold">
              {order.payment_status === "paid" ? "Transferencia confirmada ✓" : `Transfiere ${formatMXN(order.total_cents)}`}
            </h2>
            {order.payment_status !== "paid" && (
              <>
                {settings.transfer_clabe ? (
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <dt className="text-brand-ink/70">CLABE</dt>
                      <dd className="flex items-center gap-2 font-mono tabular-nums">
                        {settings.transfer_clabe}
                        <CopyButton value={settings.transfer_clabe} label="Copiar" />
                      </dd>
                    </div>
                    {settings.transfer_bank && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-brand-ink/70">Banco</dt>
                        <dd>{settings.transfer_bank}</dd>
                      </div>
                    )}
                    {settings.transfer_holder && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-brand-ink/70">A nombre de</dt>
                        <dd>{settings.transfer_holder}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <dt className="text-brand-ink/70">Concepto</dt>
                      <dd>Pedido {order.number}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm">Escríbenos por WhatsApp y te pasamos los datos para transferir.</p>
                )}
                <p className="text-sm text-brand-ink/75">
                  {order.payment_proof_path
                    ? "Recibimos tu comprobante. En cuanto confirmemos el pago empezamos a preparar tu pedido."
                    : "Después de transferir, sube aquí la captura del comprobante. Preparamos tu pedido en cuanto confirmemos el pago."}
                </p>
                {canUploadProof(state) && <ProofUploader token={order.token} hasProof={Boolean(order.payment_proof_path)} />}
              </>
            )}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Lo que pediste</h2>
          <ul className="flex flex-col divide-y divide-brand-border rounded-[14px] border border-brand-border">
            {order.order_items.map((item) => {
              const extras = Array.isArray(item.extras) ? (item.extras as { name: string }[]).map((e) => e.name) : [];
              const details = [item.size_name, ...extras].filter(Boolean).join(" · ");
              return (
                <li key={item.id} className="flex items-start justify-between gap-3 p-3.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {item.quantity} × {item.product_name}
                    </p>
                    {details && <p className="text-xs text-brand-ink/70">{details}</p>}
                    {item.note && <p className="text-xs italic text-brand-ink/70">“{item.note}”</p>}
                  </div>
                  <span className="shrink-0 tabular-nums">{formatMXN(item.line_cents)}</span>
                </li>
              );
            })}
            {order.type === "delivery" && (
              <li className="flex items-center justify-between gap-3 p-3.5 text-sm">
                <span>Envío</span>
                <span className="text-right tabular-nums">{order.delivery_fee_cents === null ? "Por confirmar" : formatMXN(order.delivery_fee_cents)}</span>
              </li>
            )}
            <li className="flex items-center justify-between p-3.5 font-semibold">
              <span>{order.type === "delivery" && order.delivery_fee_cents === null ? "Total sin envío" : "Total"}</span>
              <span className="tabular-nums">{formatMXN(order.total_cents)}</span>
            </li>
          </ul>
          <p className="text-sm text-brand-ink/70">
            {PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod]} ·{" "}
            {order.payment_status === "paid"
              ? "pagado"
              : order.payment_status === "refunded"
                ? "te regresamos el dinero"
              : order.status === "cancelled"
                ? "sin cobro"
                : order.payment_method === "cash"
                  ? "pagas al recibir"
                  : "pago pendiente"}
          </p>
          {order.note && <p className="text-sm text-brand-ink/70">Nota: “{order.note}”</p>}
        </section>

        <InstallPrompt place="order" iconUrl={getSiteAssetUrl(settings.logo_path)} />

        <section className="flex flex-col gap-3 border-t border-brand-border pt-5">
          <p className="text-xs text-brand-ink/60">Guarda esta página para ver cómo va tu pedido; se actualiza sola.</p>
          <div className="flex flex-wrap gap-3">
            {whatsappUrl && (
              <a href={whatsappUrl} className="rounded-full border border-brand-ink/30 px-4 py-2 text-sm font-semibold">
                Escribir por WhatsApp
              </a>
            )}
            {canCustomerCancel(state) && (
              <form action={cancelOrderAction}>
                <input type="hidden" name="token" value={order.token} />
                <ConfirmSubmit
                  message={`¿Cancelar tu pedido #${order.number}?`}
                  className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-600/10 dark:text-red-400"
                >
                  Cancelar pedido
                </ConfirmSubmit>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
