"use client";

import { useEffect } from "react";
import { LINK_KEYS, type LinkKey } from "@/lib/metrics";
import { track } from "./track";

/**
 * Cuenta los clics en enlaces marcados con `data-track="whatsapp"` (o
 * instagram, facebook, maps). Un solo listener para toda la página, así
 * las páginas del servidor no necesitan volverse componentes de cliente.
 */
export function TrackLinkClicks() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("[data-track]");
      const key = link?.getAttribute("data-track");
      if (key && (LINK_KEYS as readonly string[]).includes(key)) track("link_click", key as LinkKey);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
