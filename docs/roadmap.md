# Roadmap — MW Café & Frappés

> Creado 2026-10-06. Se actualiza en el mismo cambio que avanza o
> termina una tarea (regla 8 de `CLAUDE.md`). Al empezar cada sesión,
> leer este archivo y seguir desde donde quedó.

Leyenda: **pendiente** · **en curso** · **terminada**.

Orden acordado con el usuario (2026-10-06): menú y landing primero,
`/admin` después, pedidos sin pago en línea, y **al final Stripe e
Instagram**. El 3D es una pista paralela que se va perfeccionando.

---

## Bloqueos actuales

- Correo del negocio (P1): sin él, Supabase/Vercel/Google se crean a
  nombre del desarrollador y se transfieren después.
- Menú real y fotos oficiales (P2, P3): se trabaja con datos de ejemplo.
- Ver la tabla completa de pendientes en `CLAUDE.md`, sección 12.

---

## Fase 0 — Arranque · **terminada** (2026-10-06)

- [x] Revisar Axel Style y decidir qué se reutiliza (`CLAUDE.md` 3.2)
- [x] Resolver preguntas iniciales con el usuario (`docs/decisiones.md`)
- [x] Estudio de QR con la marca MW (artefacto)
- [x] `CLAUDE.md`, roadmap, decisiones, docs de Instagram, 3D y diseño
- [x] **Aprobación del usuario** de este roadmap y de la paleta (2026-10-06)

**Terminada cuando:** el usuario aprueba el plan.

## Fase 1 — Base del proyecto · **en curso** (2026-10-06)

- [x] Next.js + TS + Tailwind 4 + pnpm, copiando de Axel: estructura,
      `app/admin` (login, layout, nav, componentes), PWA, SEO, legales
      (redactadas para MW; borrador hasta P1/P5/P13)
- [x] Migración inicial `20261006000000_init_schema.sql`: `business_settings`,
      `categories`, `products`, `product_sizes`, `extra_groups`, `extras`,
      `product_extra_groups`, `landing_sections`, `admin_users`; RLS de solo
      lectura; buckets `menu-photos`, `menu-models`, `site-assets`
- [x] Seed `supabase/seed/mw-cafe.sql`: 3 categorías, 15 productos, 14
      tamaños, 20 extras (todo `is_sample`) y fotos en `public/sample`
- [x] Tokens de la paleta en `app/globals.css` (claro, oscuro y `dark:`)
- [x] Logo en variantes (café, crema, ícono de app, favicon) en `public/brand`
- [x] Portada provisional (identidad, favoritos, horario, ubicación) y
      `/admin` con inicio (números del menú, abierto/cerrado)
- [x] `lib/money.ts` y `lib/weekly-hours.ts` con pruebas (60 pasan)
- [x] Cron diario `/api/cron/daily` (keep-alive) y `scripts/create-admin.mjs`
- [x] Probado en local con Supabase en Docker: migración, seed, RLS,
      login de `/admin`, portada en claro/oscuro y celular, `pnpm build`
- [x] Respuestas P3–P7 aplicadas: Crepas y Sodas italianas en el seed (21
      productos), dirección de Instagram, reglas de programados y envío
- [x] **Supabase en la nube** (`stzbrtfozwtvxozalydo`, cuenta
      mwcafefrappesdev): migración + seed aplicados el 2026-10-06;
      verificado con la llave pública (5 categorías, 21 productos, 27
      extras, 3 buckets) y la portada leyendo de producción
- [x] Git: `origin` sube a dos repos a la vez
      (`mauriciocastillo893/mw_cafeyfrappes` y `mwcafefrappes/mw_cafeyfrappes`);
      Vercel se conecta al del cliente
- [ ] **Proyecto de Vercel** + variables + primer deploy (necesita al usuario)
- [ ] Cuentas de `/admin` en producción: desarrollador ya; Franco cuando
      tengamos su correo (P1)

**Pruebas:** `lib/money.test.ts`, `lib/weekly-hours.test.ts`, RLS manual (`docs/pruebas.md`).
**Terminada cuando:** el esqueleto está en línea y `/admin/login` funciona.

> Para la Fase 5 se vuelven a copiar de Axel `lib/google-auth.ts`,
> `lib/gmail.ts` y `lib/google-calendar.ts` (se quitaron en la Fase 1
> para no cargar código sin usar).

## Fase 2 — Menú digital (`/menu`) · **en curso** (2026-10-07)

- [x] Lista por categorías con foto, precio, tamaños y "agotado"; barra
      de categorías fija que marca la sección actual
- [x] Búsqueda (sin acentos) y filtro frío/caliente
- [x] Detalle de producto con tamaños, extras (mínimo/máximo) y total;
      link compartible `?producto=slug`; "atrás" lo cierra
- [x] Lectura de `?mesa=N` (1–99 hasta P12), guardada en la pestaña
      (`sessionStorage`) para el pedido
- [x] Aviso de horario cuando está cerrado ("Abrimos mañana a las 7:00 p. m.")
- [x] Producto agotado visto en vivo (marcado desde `/admin/menu`, 2026-10-08)
- [x] Botón "Ver menú" en la portada y `/menu` en el sitemap
- [x] `docs/casos-de-uso.md` con el primer flujo
- [ ] Revisión del usuario en su celular (en línea, cuando exista el deploy)

**Pruebas:** `lib/menu.test.ts` (búsqueda, filtro, mesa, próxima
apertura), `lib/item-price.test.ts` (precio con tamaño y extras,
agotado, mínimo/máximo; se reutiliza en el servidor en la Fase 5) y
`lib/money.test.ts`. 84 pasan.
**Terminada cuando:** el menú se ve bien en celular desde el QR.

## Fase 3 — Landing (`/`) · **en curso** (2026-10-08)

- [x] Barra fija con "Ver menú"; portada con foto del local, "Extensión
      de Mundo Waffle Huatulco" y abierto/cerrado con la próxima apertura
- [x] Favoritos (hasta 6, los marcados "mostrar en landing"), cada uno
      abre su detalle en `/menu?producto=…`
- [x] Quiénes somos, horario, ubicación (mapa, copiar dirección, Google y
      Apple Maps), contacto (WhatsApp, Instagram, Facebook), instalar app
- [x] Textos e imágenes por sección leídos de `landing_sections` con
      valores por defecto (`lib/landing-content.ts`); se editan en
      `/admin/landing` (Fase 4)
- [ ] Revisión de Franco de los textos por defecto
- [ ] Video del reel en la portada (opcional; por definir con el usuario)

**Pruebas:** `lib/landing-content.test.ts` (valores por defecto, links de mapas). 88 pasan.

## Fase 4 — `/admin` · **terminada** (2026-10-08)

- [x] Menú (`/admin/menu`): productos (crear, editar, borrar, ordenar,
      agotado y oculto con un clic), tamaños, grupos de extras por
      producto, etiquetas, "en portada", fotos (se reducen en el
      navegador a ~1600 px antes de subir); categorías (crear, editar,
      ocultar, ordenar, borrar si están vacías); extras (grupos con
      mínimo/máximo, precio, "hay", orden). Probado contra Supabase local
- [x] Negocio (`/admin/negocio`): tipos de pedido y envío (mínimo,
      costo, automático/manual), matriz de métodos de pago, datos de
      transferencia (CLABE validada), pedidos programados (anticipación,
      cada cuántos minutos, máximo por horario, días adelante), contacto y
      redes, ubicación, sitio y Google, ícono del sitio. Domicilio y
      tarjeta bloqueados hasta que exista `STRIPE_SECRET_KEY` (Fase 6)
- [x] Horario (`/admin/horario`): días y horas de apertura (un horario
      por día, cierre después de medianoche permitido, todos cerrados
      permitido) y cómo se escribe la hora en el sitio, con vista previa
      de lo que ve el cliente. Probado contra Supabase local
- [x] Portada (`/admin/landing`, "Portada" en el panel): título y texto
      de cada sección (vacío o igual al original = texto original), foto
      del encabezado y de "Quiénes somos" (se reduce a 2000 px), lista de
      favoritos actuales con enlace a Menú. Probado contra Supabase local
- [x] QR (`/admin/qr`): número de mesas (6, editable) y el estudio del
      artefacto portado al panel: mostrador o mesa 1…N, logo MW al centro
      (o subido, con recorte y quitado de fondo), texto al pie, colores,
      formas; descarga de la tarjeta, del QR en PNG/SVG y de todas las
      mesas de una vez. El diseño se recuerda en el navegador. Probado:
      los QR se leen y llevan a `/menu?mesa=N`
- [x] Métricas (`/admin/metricas`): contadores propios por día en
      `metric_counts` (sin datos de personas): visitas al menú (y desde
      qué mesa), productos más vistos, clics a WhatsApp, Instagram,
      Facebook y mapas. Periodos de 7, 30 y 90 días. No se cuentan
      navegadores donde se entró al panel. Visitas generales: Vercel

**Pruebas:** `lib/admin/menu-form.test.ts` (validación de producto,
tamaños, categorías, extras, orden) y `lib/admin/business-form.test.ts`
(WhatsApp, CLABE, matriz de pagos, envío, programados, SEO, días y
horas, formato de hora) y `lib/admin/landing-form.test.ts` (textos de
la portada), `lib/qr.test.ts` (enlace por mesa, hueco del logo,
contraste), número de mesas y `lib/metrics.test.ts` (validación de
conteos, fechas en hora de México, resumen). 140 pasan.

## Fase 5 — Pedidos (sin pago en línea) · pendiente

- [ ] Carrito y cálculo de total en el servidor (tamaños + extras)
- [ ] Tipos de pedido (mostrador / mesa / domicilio) activables
- [ ] Ahora o programado: anticipación 2 h, cada 30 min, máx. 5 por
      franja, otros días solo si abren (todo editable)
- [ ] Efectivo y transferencia; matriz de pagos en `/admin/negocio`
- [ ] Envío a domicilio $40 con switch automático/manual; en manual, la
      tienda fija el envío en `/admin/pedidos`
- [ ] `/pedido/<token>` con estado en vivo
- [ ] `/admin/pedidos`: tablero en vivo, sonido, cambio de estado, marcar pagado
- [ ] Correo al negocio (Gmail) y evento en Calendar para programados

**Pruebas:** total, mínimo de domicilio ($80), horas programables,
matriz de pagos, transiciones de estado.
**Terminada cuando:** se puede pedir de punta a punta y el personal lo ve.

## Pista paralela — 3D / AR · pendiente

Ver `docs/3d-ar.md`. Etapas:
- [ ] Etapa 1: `<model-viewer>` en el detalle de producto con un modelo de prueba
- [ ] Etapa 2: affogato, frappé y café generados por IA desde foto + limpieza en Blender
- [ ] Etapa 3: subir y reemplazar modelos desde `/admin/menu`
- [ ] Etapa 4: mejorar realismo (modelado en Blender, escaneo de waffles)

## Fase 6 — Stripe Checkout · pendiente

- [ ] Cuenta de Stripe de Franco (P9); llaves de prueba primero
- [ ] Checkout para domicilio (tarjeta, Google Pay, Apple Pay)
- [ ] Webhook `checkout.session.completed` → pedido pagado
- [ ] Reembolso desde `/admin/pedidos` (opcional)
- [ ] Activar domicilio

## Fase 7 — Instagram · pendiente (no confirmado)

Ver `docs/instagram.md`.

## Fase 8 — Cierre · pendiente

- [ ] Páginas legales con datos finales (P13)
- [ ] Prueba real con Franco en el local
- [ ] `docs/manual-franco.md`
