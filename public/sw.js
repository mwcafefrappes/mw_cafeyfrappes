// Service worker de MW Café & Frappés (PWA, base copiada de Axel Style).
// Alcance chico a propósito: no es una app offline-first, solo hace que
// se pueda instalar en el celular y cachea lo justo para que abrir la app
// sin señal no muestre un error del navegador.
//
// Nunca intercepta /admin, /api ni /pedido: esas rutas siempre van a la
// red (sesión de Supabase Auth, webhooks y estado del pedido en vivo).

const CACHE_NAME = "mw-cafe-shell-v2";
// La app instalada abre en /menu (start_url del manifest).
const APP_SHELL = ["/", "/menu", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api") || url.pathname.startsWith("/pedido")) {
    return; // sin interceptar: siempre red, nunca caché
  }

  // Navegación (HTML): red primero (contenido fresco), caché de
  // respaldo solo si no hay conexión.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(url.pathname.startsWith("/menu") ? "/menu" : "/"))
        )
    );
    return;
  }

  // Fotos y modelos 3D del menú, logo e imágenes de la landing en
  // Supabase Storage: la ruta cambia en cada subida (ver lib/storage.ts), así que
  // se pueden cachear "para siempre" sin arriesgar servir una vieja.
  if (url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/public/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
  }
});
