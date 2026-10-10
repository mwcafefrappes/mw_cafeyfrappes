# Arquitectura

> Creado 2026-10-06 (Fase 1). Se actualiza con cada fase.

## Piezas

```text
Navegador ──► Next.js en Vercel ──► Supabase (Postgres + Auth + Storage)
                │
                ├─ /                  landing (estática, se regenera cada 60 s)
                ├─ /menu              menú digital (estática, se regenera cada 60 s)
                ├─ /admin/*           panel (proxy.ts exige sesión; requireAdminUser revisa admin_users)
                ├─ /api/cron/daily    cron diario de Vercel (keep-alive de Supabase)
                └─ /privacidad /terminos /eliminar-datos
```

Próximas: `/pedido/<token>` y `/admin/pedidos`
(Fase 5), webhook de Stripe (Fase 6), webhook de Instagram (Fase 7).

## Acceso a datos

| Quién | Cliente | Ve |
|---|---|---|
| Visitante | `lib/public-data.ts` (anon key) | Lo que permiten las policies: categorías y productos activos (agotados incluidos), extras, ajustes del negocio, landing |
| `/admin` | `lib/admin/data.ts`, `lib/admin/actions.ts` (service_role) | Todo. Siempre después de `requireAdminUser()` |
| Login | `lib/admin/supabase-server.ts` (anon + cookies) | Su propia fila de `admin_users` |

## Tablas (Fase 1)

| Tabla | Para qué |
|---|---|
| `business_settings` | Una fila: contacto, dirección, horario (`weekly_hours`), reglas y métodos de pago de pedidos, SEO |
| `categories` | Waffles, Café, Frappés… (`active` oculta) |
| `products` | Producto; `is_available = false` es "agotado", `active = false` es oculto; `photo_path`, `model_glb_path`, `is_sample` |
| `product_sizes` | Tamaños con precio completo |
| `extra_groups`, `extras` | Extras reutilizables con mínimo/máximo |
| `product_extra_groups` | Qué grupos ofrece cada producto |
| `landing_sections` | Textos de la landing (Fase 3) |
| `admin_users` | Lista blanca de `/admin` |

Precios en centavos (`integer`). Formato: `lib/money.ts`.

## Storage

Buckets públicos de lectura: `menu-photos`, `menu-models` (3D),
`site-assets` (logo, imágenes de landing). Las rutas que empiezan con
`/` son archivos de `public/` (fotos de ejemplo en `public/sample`).

## Tema

Tokens `--brand-*` en `app/globals.css`. El sitio sigue el tema del
sistema; `/admin` tiene botón sol/luna (`data-theme` en `#admin-shell`).
La variante `dark:` de Tailwind respeta ambas cosas.

## Menú (`/menu`)

- `app/menu/page.tsx` (servidor) lee el menú con `getPublicMenu()`
  (categorías → productos → tamaños y grupos de extras con sus extras,
  todo en orden) y le pasa al navegador solo lo que se pinta
  (`app/menu/types.ts`).
- La página es **estática con ISR de 60 s**: no lee la URL en el
  servidor. `?mesa=`, `?producto=` y el reloj (abierto/cerrado) se
  resuelven en el navegador con `useSyncExternalStore`
  (`app/menu/client-state.ts`), sin `setState` en efectos.
- Abrir un producto hace `pushState` (atrás lo cierra); un link
  compartido se cierra con `replaceState`.
- La mesa se guarda en `sessionStorage["mw-mesa"]` para el pedido.
- Lógica pura: `lib/menu.ts` (búsqueda, filtro, mesa, próxima apertura)
  y `lib/item-price.ts` (precio con tamaño y extras; el servidor lo
  vuelve a correr al crear el pedido en la Fase 5).

## Landing (`/`)

- `app/page.tsx` lee ajustes, menú (favoritos = `show_on_landing`) y
  `landing_sections` con `getPublicLandingSections()`, que junta lo
  guardado con los valores por defecto de `lib/landing-content.ts`.
- Abierto/cerrado se calcula en el navegador (`app/OpenStatus.tsx`) para
  que una página regenerada hace rato no muestre un estado viejo.
- Imágenes por defecto: `public/sample/local-terraza.jpg` (portada) y
  `local-barra.jpg` (quiénes somos), hasta que suban las oficiales (P3).

## `/admin/menu`

- Lecturas: `lib/admin/data.ts` (`getMenuAdmin`, `getProductAdmin`,
  `getExtraGroupsAdmin`, con ocultos y agotados).
- Escrituras: `lib/admin/menu-actions.ts` (Server Actions), validación
  pura en `lib/admin/menu-form.ts`. Cada cambio hace `revalidatePath` de
  `/menu` y `/`.
- Tamaños: se actualizan por nombre (`upsert` en `product_id,name`) para
  conservar su id; los grupos de extras del producto se reemplazan.
- Fotos: el navegador las reduce a 1600 px JPG (`PhotoUploader.tsx`);
  el servidor acepta JPG/PNG/WebP hasta 4 MB (`serverActions.bodySizeLimit`)
  y borra la foto anterior de Storage (nunca las de `public/sample`).
- Guardar un producto le quita `is_sample`.
- Desarrollo sin tocar producción: `scripts/dev-local.mjs` corre `next dev`
  con las llaves del Supabase local (le ganan a `.env.local`).

## `/admin/negocio` y `/admin/horario`

- Un formulario por tarjeta (`SettingsSection.tsx`); todos van a `saveBusinessSectionAction`
  (`lib/admin/business-actions.ts`) con `section`, que valida solo esa
  parte (`lib/admin/business-form.ts`) y regenera todo el sitio
  (`revalidatePath("/", "layout")`).
- Métodos de pago: `lib/payment-methods.ts` (`parsePaymentMatrix`,
  `effectiveMethods`). Domicilio siempre `["card"]`.
- `env.stripeReady` (hay `STRIPE_SECRET_KEY`) habilita domicilio y
  tarjeta. Sin Stripe el servidor también los rechaza.
- Ícono del sitio (`logo_path`, bucket `site-assets`): el navegador lo
  reduce a 512 px PNG. Se usa como favicon, imagen al compartir e ícono
  del panel; el logo de la portada y el menú sigue siendo el de `public/brand`.
- Horario: secciones `dias` (`weekly_hours`, un `{day, start, end}` por
  día abierto; `end < start` = cierra después de medianoche) y `formato`
  (`time_format`). Lo leen `lib/weekly-hours.ts` y `lib/time-format.ts`.

## `/admin/landing` ("Portada")

- `lib/admin/landing-actions.ts`: `saveLandingTextAction` (upsert en
  `landing_sections` por `key`), `uploadLandingImageAction` y
  `removeLandingImageAction` (bucket `site-assets`, `landing-<key>-<ts>.jpg`;
  borra la anterior; las de `/sample` no se tocan). Regenera `/`.
- Validación en `lib/admin/landing-form.ts`; `null` = texto/foto por
  defecto de `lib/landing-content.ts` (`resolveLandingSections`).
- `MAX_FEATURED_PRODUCTS` (6) vive en `lib/landing-content.ts`; lo usan
  la portada y el panel.

## `/admin/qr`

- Número de mesas: sección `mesas` de `saveBusinessSectionAction`
  (`business_settings.table_count`).
- Estudio: `QrStudio.tsx` (cliente, cargado con `next/dynamic` sin SSR
  desde `QrStudioLoader.tsx` para leer `localStorage` sin errores de
  hidratación). Dibujo en `qr-render.ts` (qr-code-styling + canvas:
  logo en un hueco alineado a la cuadrícula, tarjeta con pie de texto).
  Cálculos puros en `lib/qr.ts`.
- El enlace sale de la dirección del sitio (`resolveSiteBaseUrl`) +
  `/menu`, con `?mesa=N` para las mesas.

## Métricas

- Tabla `metric_counts` (día en hora de México + métrica + clave +
  conteo), sin políticas de RLS: solo `service_role`. La función
  `increment_metric` suma 1 con `on conflict` (sin carreras).
- Navegador → `track()` (`app/track.ts`, `sendBeacon`) → `POST
  /api/metrics` → valida con `normalizeMetricKey` (`lib/metrics.ts`) →
  `rpc("increment_metric")`. Ignora navegadores con cookie `sb-…-auth-token`.
- Dónde se cuenta: `MenuView.tsx` (visita una vez por carga, con la mesa
  de `?mesa=`; producto al abrir su detalle) y `TrackLinkClicks.tsx` en el
  layout (enlaces con `data-track` en la portada).
- `/admin/metricas` lee por páginas de 1000 (límite de Supabase) y
  resume con `summarizeMetrics`.

## Pedidos (Fase 5)

- Tablas `orders` (token, `service_day` + `number` únicos, tipo, mesa,
  cliente, programado, estado, pago, comprobante, totales) y
  `order_items` (copia de nombres y precios). Número del día con
  `next_order_number()` sobre `order_day_counters` (sin carreras). RLS:
  solo cuentas de `admin_users` leen; nadie escribe salvo `service_role`.
  `orders` está en la publicación `supabase_realtime`.
- Lógica pura: `lib/orders.ts` (forma, reglas, precios, estados),
  `lib/order-slots.ts` (horas programables), `lib/order-config.ts`
  (ajustes → reglas), `lib/order-format.ts` (textos).
- Servidor: `lib/order-server.ts` (precios desde `getPublicMenu`, horarios
  ocupados, crear, leer por token, avisos), `lib/order-actions.ts`
  (crear, cancelar, comprobante), `lib/admin/order-actions.ts`
  (estado y pago, condicionados al estado visto).
- Cliente: `app/cart-store.ts` (carrito y pedidos recientes en
  `localStorage` con `useSyncExternalStore`), `ProductSheet` (Agregar),
  `app/menu/CartBar.tsx`, `/carrito` (`CheckoutView`), `/pedido/[token]`
  (con `AutoRefresh` cada 10 s y `ProofUploader`).
- Panel: `/admin/pedidos` (`OrdersBoard`: Realtime con el cliente de
  navegador de `@supabase/ssr` + refresco cada 30 s, sonido con WebAudio).
- Comprobantes: bucket privado `payment-proofs` (`<order_id>/<ts>.jpg`),
  URLs firmadas de 1 h en el tablero.
- Avisos: `lib/gmail.ts` y `lib/google-calendar.ts` (portados de Axel),
  `lib/google-auth.ts`. Sin llaves, solo log.

## Domicilio (Fase 6)

- Migración `20261011000000_delivery.sql`: `business_settings.delivery_radius_m`
  y en `orders` dirección, referencias, punto (`delivery_lat/lng`),
  distancia y `on_board` (false = con tarjeta sin pagar; el tablero no lo
  muestra). `cancelled_by` admite `system`.
- `lib/geo.ts`: distancia en línea recta y enlace a Maps.
- `lib/orders.ts`: domicilio en `parseOrderRequest` y `orderRulesError`
  (zona), `orderTotals` (mínimo y envío), `startsOnBoard`,
  `needsDeliveryFee`, `canPayOnline`.
- `lib/order-server.ts`: `expireUnpaidOrders` (se llama al cargar el
  carrito y la página del pedido).
- `app/carrito/DeliveryMap.tsx`: Leaflet + OpenStreetMap, cargado solo en
  el navegador. `setDeliveryFeeAction` en `lib/admin/order-actions.ts`.
- `startCardPaymentAction` (`lib/order-actions.ts`) es donde se conecta
  Stripe Checkout.

## Stripe (Fase 6)

- Migración `20261012000000_stripe.sql`: en `orders`,
  `stripe_checkout_session_id`, `stripe_payment_intent_id` y `pay_by`.
- `lib/card-payment.ts` (puro): plazo para pagar, renglones de Checkout,
  monto pagado.
- `lib/stripe.ts`: cliente del SDK. `lib/stripe-payments.ts`:
  `openCheckout`, `closeCheckout`, `refundOrder`, `handleStripeEvent`.
- `app/api/stripe/webhook/route.ts`: verifica la firma con el cuerpo tal
  cual y atiende los eventos; 500 si algo falla (Stripe reintenta).
- `placeOrderAction` regresa `checkoutUrl`; `startCardPaymentAction` es
  "Pagar"; `setOrderStatusAction` reembolsa antes de cancelar uno pagado.

## 3D (pista paralela)

- `lib/models.ts` (puro): tipos `glb`/`usdz`, tamaño, formato, ruta.
- `app/ModelViewer3D.tsx`: `<model-viewer>` (importado al abrirse) con
  "Ver en tu mesa"; tipos JSX en `app/model-viewer.d.ts`. Lo usan
  `ProductSheet` y el panel.
- Panel: `ModelUploader` → `prepareModelUploadAction` (permiso firmado) →
  `uploadToSignedUrl` desde el navegador → `saveProductModelAction`
  (revisa con `storage.info` y liga al producto). Bucket público
  `menu-models`.

## Comprobantes

- `business_settings.proof_retention_days` (migración
  `20261013000000_proof_retention.sql`); el cron diario
  (`/api/cron/daily`) borra hasta 500 capturas por corrida
  (`lib/retention.ts`).

## App instalada (PWA)

- `app/manifest.ts`: `start_url` `/menu` (el `id` sigue en `/`), atajos
  `/menu` y `/mis-pedidos`. `public/sw.js` guarda `/` y `/menu` para abrir
  sin señal (caché `mw-cafe-shell-v2`).
- `app/useInstallApp.ts`: lo común de instalar (aviso del navegador o guía
  `InstallGuideModal`) y "ya lo cerró" (`localStorage`). Lo usan
  `InstallApp` (sección de la portada) e `InstallPrompt` (aviso del menú y
  de `/pedido/<token>`, solo en celular).
- `app/mis-pedidos`: lista los pedidos recordados por `cart-store.ts`.
