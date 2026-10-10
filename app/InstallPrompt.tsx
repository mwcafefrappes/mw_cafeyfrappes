"use client";

import { business } from "@/lib/config/business";
import { InstallGuideModal } from "./InstallGuideModal";
import { useInstallApp, useInstallDismissed } from "./useInstallApp";

const TEXT = {
  menu: `Instala ${business.shortName} en tu celular y pide con un toque.`,
  order: "Instala la app para ver tus pedidos y volver a pedir más rápido.",
};

/**
 * Aviso chico de "Instalar app" en el menú y en la página del pedido
 * (decisión del usuario 2026-10-09: casi todos llegan por el QR y no ven la
 * portada). Solo en celular, nunca dentro de la app instalada, y si el
 * cliente lo cierra no vuelve a salir en ninguno de los dos lugares.
 */
export function InstallPrompt({ place, iconUrl }: { place: "menu" | "order"; iconUrl: string | null }) {
  const { standalone, platform, justInstalled, guideOpen, closeGuide, install } = useInstallApp(true);
  const [dismissed, dismiss] = useInstallDismissed();

  if (standalone || dismissed || platform === "other") return null;

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-brand-border bg-brand-sand px-4 py-3 text-sm">
      {justInstalled ? (
        <p className="flex-1 font-medium">¡Listo! Ya tienes la app instalada.</p>
      ) : (
        <>
          <p className="min-w-0 flex-1">{TEXT[place]}</p>
          <button
            type="button"
            onClick={install}
            className="shrink-0 cursor-pointer rounded-full bg-brand-primary px-3.5 py-1.5 text-xs font-semibold text-brand-on-primary"
          >
            Instalar
          </button>
        </>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso de instalar la app"
        className="-mr-1 shrink-0 cursor-pointer rounded-full px-2 py-1 text-base leading-none text-brand-ink/60 hover:bg-brand-ink/10"
      >
        ×
      </button>
      {guideOpen && <InstallGuideModal initialTab={platform === "android" ? "android" : "ios"} iconUrl={iconUrl} onClose={closeGuide} />}
    </div>
  );
}
