"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Vuelve a pedir la página cada `seconds` mientras el pedido siga abierto,
 * y al regresar a la pestaña. Sencillo y sin abrir la tabla de pedidos al
 * público (el cliente no tiene cuenta, solo su token).
 */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);
  return null;
}
