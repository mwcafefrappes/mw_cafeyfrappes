import type { Metadata } from "next";
import { business } from "@/lib/config/business";
import { MyOrders } from "./MyOrders";

export const metadata: Metadata = {
  title: `Mis pedidos · ${business.name}`,
  robots: { index: false },
};

/**
 * Atajo "Mis pedidos" del ícono de la app (decisión del usuario 2026-10-09).
 * Lista los pedidos que este celular recuerda (`cart-store.ts`); no hay
 * cuenta, así que no ve pedidos hechos desde otro celular o navegador.
 */
export default function MyOrdersPage() {
  return <MyOrders serverNow={new Date().getTime()} />;
}
