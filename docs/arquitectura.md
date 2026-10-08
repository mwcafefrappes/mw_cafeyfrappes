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
