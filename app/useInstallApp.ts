"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type Platform = "ios" | "android" | "other";

function subscribeNever(): () => void {
  return () => {};
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Lo común de "Instalar app" (portada, aviso del menú y página del pedido).
 * `install()` usa el aviso del navegador si lo hay (`beforeinstallprompt`:
 * Chrome/Edge en Android y computadora); si no —iPhone nunca lo tiene— o
 * el cliente lo cierra, abre la guía paso a paso (`InstallGuideModal`).
 * `serverStandalone`: qué suponer en el servidor. La portada pinta su
 * sección desde el servidor (`false`); los avisos esperan a saber (`true`).
 */
export function useInstallApp(serverStandalone: boolean) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const standalone = useSyncExternalStore(subscribeNever, isStandalone, () => serverStandalone);
  const platform = useSyncExternalStore(subscribeNever, detectPlatform, (): Platform => "other");
  const openGuide = useCallback(() => setGuideOpen(true), []);
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  useEffect(() => {
    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    function handleInstalled() {
      setInstallPrompt(null);
      setJustInstalled(true);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    // El navegador puede avisar antes de que React cargue; `app/layout.tsx`
    // guarda ese aviso en `window.__installPrompt` para no perderlo.
    const early = (window as Window & { __installPrompt?: BeforeInstallPromptEvent }).__installPrompt;
    const timer = setTimeout(() => {
      if (early) setInstallPrompt(early);
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) {
      setGuideOpen(true);
      return;
    }
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (outcome === "dismissed") setGuideOpen(true);
  }, [installPrompt]);

  return { standalone, platform, justInstalled, guideOpen, openGuide, closeGuide, install };
}

const DISMISS_KEY = "mw-install-dismissed";
const DISMISS_EVENT = "mw:install-dismissed";

function subscribeDismissed(callback: () => void) {
  window.addEventListener(DISMISS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(DISMISS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// Respaldo si `localStorage` no se puede usar (modo privado).
let dismissedInMemory = false;

function readDismissed(): boolean {
  if (dismissedInMemory) return true;
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** El cliente cerró el aviso de instalar: no se le vuelve a ofrecer en el menú ni en su pedido. */
export function useInstallDismissed(): [boolean, () => void] {
  // En el servidor cuenta como cerrado, para no pintar el aviso antes de saber.
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => true);
  const dismiss = useCallback(() => {
    dismissedInMemory = true;
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Modo privado: el aviso se oculta mientras la página esté abierta.
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }, []);
  return [dismissed, dismiss];
}
