/**
 * Manda un conteo a `/api/metrics` sin esperar respuesta (`sendBeacon`
 * sobrevive aunque la página se cierre, p. ej. al tocar WhatsApp). Nunca
 * falla hacia afuera: si algo sale mal, simplemente no se cuenta.
 */

import type { Metric } from "@/lib/metrics";

export function track(metric: Metric, key = "") {
  try {
    const body = JSON.stringify({ m: metric, k: key });
    if (navigator.sendBeacon?.("/api/metrics", new Blob([body], { type: "text/plain" }))) return;
    void fetch("/api/metrics", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // Sin red o navegador viejo: no se cuenta.
  }
}
