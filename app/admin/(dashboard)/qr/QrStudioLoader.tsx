"use client";

import dynamic from "next/dynamic";

/** El estudio dibuja con canvas y recuerda el diseño en este navegador: se carga solo en el navegador. */
export const QrStudioLoader = dynamic(() => import("./QrStudio"), {
  ssr: false,
  loading: () => <p className="text-sm text-brand-ink/60">Cargando el estudio de QR…</p>,
});
