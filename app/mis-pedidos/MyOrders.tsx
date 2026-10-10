"use client";

import Link from "next/link";
import { timeAgoEs } from "@/lib/time-ago";
import { recentOnly, useRecentOrders } from "../cart-store";
import { useMinuteClock } from "../menu/client-state";

export function MyOrders({ serverNow }: { serverNow: number }) {
  const now = useMinuteClock(serverNow);
  const orders = recentOnly(useRecentOrders(), now);

  return (
    <main className="flex flex-1 flex-col bg-brand-cream text-brand-ink">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] sm:px-6">
        <Link href="/menu" className="self-start text-sm font-medium underline underline-offset-4">
          ← Menú
        </Link>
        <h1 className="font-display text-3xl font-bold">Mis pedidos</h1>

        {orders.length === 0 ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm text-brand-ink/70">
              No tienes pedidos de las últimas 12 horas en este celular. Si pediste desde otro navegador, abre el
              enlace de tu pedido desde ahí.
            </p>
            <Link href="/menu" className="rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-on-primary">
              Ver el menú
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.token}>
                <Link
                  href={`/pedido/${order.token}`}
                  className="flex items-center justify-between gap-3 rounded-[14px] border border-brand-border bg-brand-sand px-4 py-3.5 hover:border-brand-accent"
                >
                  <span>
                    <span className="font-semibold">Pedido #{order.number}</span>
                    <span className="block text-xs text-brand-ink/60">{timeAgoEs(order.createdAt, now)}</span>
                  </span>
                  <span className="text-sm font-medium">
                    Ver cómo va <span aria-hidden>→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
