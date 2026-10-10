# CLAUDE.md — MW Café & Frappés (menú digital + pedidos + landing + /admin)

> Creado 2026-10-06. Este archivo le dice a Claude (Claude Code) cómo
> trabajar en este repo. Léelo completo antes de tocar código.
>
> La base técnica se toma de **Axel Style** (`../../Axel Styles/Axel-Styles`):
> stack, `/admin`, Gmail/Calendar, PWA, SEO y la forma de documentar.
> **No** se copia el bot de WhatsApp ni la agenda de citas. Donde este
> archivo y el de Axel difieran, manda este archivo.

---

## 0. Reglas de trabajo (obligatorias)

1. **Si hay una duda, se pregunta. Nunca se asume.** Incluye precios,
   horarios, textos al cliente y reglas de pedidos.
2. Lo que el usuario no pueda responder en el momento va a
   **"Pendientes"** (sección 12) con fecha, y se sigue con lo demás.
3. Cada decisión confirmada se escribe en `docs/decisiones.md` (fecha +
   decisión + motivo) en el mismo cambio que la implementa.
4. Nunca pegar ni commitear secretos. Solo `.env.local` y Vercel.
   `.env.example` sin valores.
5. Todo cambio en pedidos, cobros, horarios o cálculo de totales viene
   con su caso de prueba (sección 11).
6. Código en inglés; textos al usuario y documentación en español de
   México. Los textos de `/admin` nunca mencionan archivos internos,
   tablas ni jerga de desarrollo.
7. **Todo en plan gratuito** (sección 3.1). Lo único que cuesta es la
   comisión de Stripe por cobro, aprobada por el usuario.
8. **Roadmap obligatorio (`docs/roadmap.md`).** Al empezar cada sesión,
   leerlo y seguir desde donde quedó. Se actualiza en el mismo cambio
   que avanza una tarea.
9. **Documentación al día** en el mismo cambio que la deje
   desactualizada: `docs/arquitectura.md`, `docs/configuracion-y-despliegue.md`,
   `docs/pruebas.md`, `docs/manual-franco.md` (al cerrar), `docs/casos-de-uso.md`
   (flujos del cliente: ver menú, pedir, pagar, seguir pedido; se crea en
   la Fase 2 con el primer flujo), y los
   específicos de este proyecto: `docs/instagram.md`, `docs/3d-ar.md`,
   `docs/diseno.md`.
10. Si algo es específico de MW fuera de la BD, `lib/config/business.ts`
    o variables de entorno, anotarlo en `docs/clonar-para-otro-cliente.md`.

---

## 1. Qué es

Una app de Next.js con cinco piezas:

1. **Menú digital** (`/menu`): waffles, café, frappés y extras, con fotos,
   tamaños, precios y "agotado". Se abre desde el QR de cada mesa
   (`/menu?mesa=N`), del mostrador o de la publicidad.
2. **Pedidos en línea** desde el menú: para **recoger en mostrador**,
   **en mesa** o **a domicilio**, ahora o **programado** a una hora.
3. **Landing** (`/`): quiénes son, productos destacados, horario,
   ubicación, redes y botón de WhatsApp. Presenta a MW como **extensión
   de Mundo Waffle Huatulco** (la tienda principal).
4. **Vista 3D / realidad aumentada** de productos: el cliente ve la
   bebida o el platillo en 3D y, con la cámara, sobre su mesa.
5. **Panel `/admin`** para Franco y el desarrollador: menú, pedidos,
   negocio, horario, métodos de pago, landing, QR y métricas.

**Al final (no confirmado aún):** respuestas automáticas de Instagram
(DMs y comentarios en reels), editables en `/admin`. Ver `docs/instagram.md`.

**No hay bot de WhatsApp.** El WhatsApp del negocio es solo un botón de
contacto (`wa.me`).

---

## 2. Datos del proyecto

| Dato | Valor | Estado |
|---|---|---|
| Nombre comercial | **MW Café & Frappés** · lema "Universo de sabor" (del logo) | ✅ |
| Relación | Extensión de **Mundo Waffle Huatulco** (@mundowafflehuatulco), que es la tienda principal | ✅ |
| Dueño | **Franco García** | ✅ |
| Cuentas de `/admin` | Franco y el desarrollador (Vyxorian Studios) | ✅ |
| WhatsApp del negocio | 958 186 1260 (`529581861260`), solo botón de contacto | ✅ |
| Correo del negocio | — | ⚠️ P1 |
| Instagram | https://www.instagram.com/mw_cafeyfrappes/ | ✅ |
| Facebook | https://www.facebook.com/profile.php?id=61579810748474 | ✅ |
| Dirección | La de Instagram: "Sector K, sobre la calle boulevard Guelaguetza, Huatulco" (editable en `/admin/negocio`) | ✅ |
| Mapa | https://maps.app.goo.gl/5nQoEUkUodharCc18 · `15.7692212, -96.1291265` | ✅ |
| Zona horaria | `America/Mexico_City` | ✅ |
| Horario | **Jueves a domingo, 19:00–23:00** (editable en `/admin`) | ✅ |
| Dominio | Ninguno por ahora → `*.vercel.app` | ⚠️ P11 |
| Logo | `../Logo/LogoInstagram.jpg` (blanco sobre negro). Versión café sin fondo generada para el QR | ✅ |
| Fotos | `../Publicaciones/` y `../Servicios/`: fotos del local y **historias de clientes** (ver sección 10.2) | ✅ Se usan por ahora |
| Video | Reel del affogato y reel de publicidad (links en `../Documentación/mw_cafeyfrappes.txt`) | ✅ |

> **Separación:** proyecto independiente. No comparte repo, deploy,
> Supabase, Stripe ni secretos con Axel Style ni con otros clientes.

---

## 3. Stack

Next.js (App Router) + TypeScript en Vercel, Supabase (Postgres + Auth +
Storage + Realtime + RLS), Stripe Checkout, Google Calendar API y Gmail
API, `<model-viewer>` de Google para 3D/AR. `pnpm`, Tailwind 4, vitest.

### 3.1 Plan gratuito

| Servicio | Plan | Notas |
|---|---|---|
| Vercel | Hobby | Un solo cron diario. Términos "no comercial": mismo riesgo aceptado que en Axel |
| Supabase | Free | Se pausa tras 7 días sin actividad: el cron diario sirve de keep-alive. **Storage 1 GB**: vigilar el peso de los modelos 3D (meta: ≤ 4 MB por modelo) |
| Stripe | Sin mensualidad | Comisión por cobro con tarjeta en México (aprox. 3.6 % + $3 MXN + IVA). Aprobado por el usuario |
| Google Calendar + Gmail | Gratis | Un refresh token con `calendar` y `gmail.send` (igual que Axel) |
| Instagram API | Gratis | Sin costo por mensaje; ventana de 24 h para responder DMs |
| 3D | Gratis | Blender (software libre), `<model-viewer>`, generadores por IA en capa gratuita |

### 3.2 Qué se reutiliza de Axel Style

| De Axel | Aquí |
|---|---|
| `app/admin` (login Supabase, `admin_users`, `AdminNav`, `Toast`, `Toggle`, `SubmitOverlay`, `ThemeToggle`) | Igual |
| `/admin/servicios` + `lib/storage.ts` | Base de `/admin/menu` (fotos y modelos 3D) |
| `/admin/negocio`, `/admin/horario`, `/admin/landing`, `/admin/metricas` | Igual, con otros campos |
| `lib/google-auth.ts`, `lib/gmail.ts`, `lib/google-calendar.ts` | Avisos por correo y eventos de pedidos programados |
| `/cita/[token]` (token como único "login") | Patrón de `/pedido/[token]` |
| PWA (manifest, service worker, banners), `seo.ts`, `robots`, `sitemap`, páginas legales | Igual, con datos de MW |
| `lib/phone.ts`, `lib/date-format-es.ts`, `lib/time-format.ts` | Igual |
| **No se copia:** `lib/bot`, `whatsapp*.ts`, `outbound-guard`, `scheduling*`, `booking-core`, `/agendar` | — |

---

## 4. Menú

- **Categorías de arranque:** Waffles, Café, Frappés, Crepas y Sodas
  italianas (confirmado 2026-10-06).
- **Producto:** nombre, descripción, categoría, foto, precio base,
  **tamaños** opcionales (p. ej. 12 oz / 16 oz con precio cada uno),
  **extras** con precio, etiquetas (frío/caliente, nuevo, favorito),
  "mostrar en landing", **agotado** (se ve pero no se puede pedir),
  orden y modelo 3D opcional.
- **Extras:** grupos reutilizables por categoría (toppings de waffle,
  extras de café, extras de frappé), con mínimo y máximo por producto.
  Los de arranque son **inventados** (P2) y se marcan como ejemplo en el
  seed.
- Todo editable en `/admin/menu`. Los precios se guardan en **centavos**
  (`integer`), nunca en `float`.

## 5. Pedidos

### 5.1 Tipos

| Tipo | Cómo llega el cliente | Datos que se piden | Mínimo |
|---|---|---|---|
| **Mostrador** (recoger) | QR de mostrador, landing o link | Nombre y teléfono | — |
| **Mesa** | QR de la mesa (`/menu?mesa=N`) | Nombre (el número de mesa viene del QR) | — |
| **Domicilio** | Landing o link | Nombre, teléfono, dirección y referencias | **$80 MXN** de subtotal (editable) |

Cada tipo se puede **activar o desactivar** en `/admin` (p. ej. domicilio
apagado hasta que Stripe esté listo).

### 5.2 Ahora o programado

- **Ahora:** se prepara en cuanto llega.
- **Programado:** el cliente elige la hora a la que recoge (o recibe),
  dentro del horario de apertura. Al confirmarse se crea un **evento en
  el Google Calendar del negocio** con el detalle del pedido.
- Reglas (confirmadas 2026-10-06, todas editables en `/admin`):
  - anticipación mínima **2 horas**;
  - se elige hora **cada 30 minutos**;
  - máximo **5 pedidos por franja** de 30 minutos;
  - se puede programar **para otro día**, solo en días y horas de
    apertura (nunca en un día que no se labora); hasta
    `scheduled_max_days_ahead` días adelante (7 por defecto, P14).
- Fuera de horario, el menú se ve pero solo deja pedir **programado**
  (si está activo) o muestra "Abrimos el jueves a las 7:00 pm".

### 5.3 Métodos de pago

Matriz editable en `/admin/negocio` (qué método se ofrece en qué tipo):

| | Efectivo | Transferencia | Tarjeta / Google Pay / Apple Pay (Stripe) |
|---|---|---|---|
| Mostrador | ✅ | ✅ | ❌ (se puede activar) |
| Mesa | ✅ | ✅ | ❌ (se puede activar) |
| Domicilio | ❌ | ❌ | ✅ **obligatorio** |

- **Efectivo y transferencia** se manejan a mano: el pedido entra como
  "pago pendiente" y el personal lo marca como pagado en `/admin/pedidos`.
  Para transferencia se muestran CLABE, banco y titular (P8, editables).
- **Stripe Checkout** (página de pago de Stripe): tarjeta, **Google Pay**
  y **Apple Pay** (Checkout los muestra solo en dispositivos compatibles,
  sin verificar dominio). El pedido se confirma **solo** con el webhook
  `checkout.session.completed`, nunca con el regreso del navegador.
- El total se calcula **en el servidor** desde la BD; nunca se confía en
  el precio que manda el navegador.

### 5.4 Estados y seguimiento

`recibido → preparando → listo → entregado`, más `cancelado`. Pago:
`pendiente`, `pagado`, `reembolsado`.

- El cliente sigue su pedido en **`/pedido/<token>`** (sin cuenta, igual
  que `/cita/<token>` de Axel), que se actualiza solo.
- El personal ve un **tablero en vivo** en `/admin/pedidos` (Supabase
  Realtime) con sonido al llegar un pedido nuevo.
- **Correo al negocio** (Gmail API) por cada pedido nuevo y cancelado.
- **Envío a domicilio: $40** (editable). Switch en `/admin/negocio`:
  - **Automático:** se cobra el envío fijo a todo pedido a domicilio.
  - **Manual:** el pedido entra sin envío definido; la tienda lo fija al
    recibirlo y el cliente ve el total actualizado en `/pedido/<token>`.
    (Con pago en línea, el cobro de Stripe se hace después de fijar el
    envío: se define en la Fase 6.)
- Reparte el dueño de la tienda. Zona: **radio de 5 km** desde el local
  (editable), el cliente marca su casa en un mapa (confirmado 2026-10-09).

## 6. Vista 3D / AR

- `<model-viewer>` con archivo `.glb`. En Android abre **Scene Viewer**;
  en iPhone, **Quick Look** (USDZ generado al vuelo o subido aparte).
  No requiere instalar app.
- Botón "Ver en 3D" en el detalle del producto, solo si tiene modelo.
- Modelos subidos desde `/admin/menu` a Supabase Storage.
- **Piloto:** affogato, un frappé y un café. Se mejora con el tiempo:
  ver `docs/3d-ar.md`.

## 7. Panel `/admin`

Login de Supabase Auth + `admin_users` (sin registro público). Secciones:
**Pedidos** (tablero en vivo) · **Menú** (categorías, productos, tamaños,
extras, agotado, fotos, 3D) · **Negocio** (datos, WhatsApp, redes,
transferencia, tipos de pedido, matriz de pagos, mínimo y costo de
domicilio) · **Horario** · **Landing** · **QR** (estudio de QR por mesa,
basado en el artefacto `https://claude.ai/artifact/5ze7M1jtJog4Cdfih3PDRy`) ·
**Métricas** · **Instagram** (al final).

## 8. Landing (`/`)

Hero con foto o video del local, "Extensión de Mundo Waffle Huatulco",
productos destacados (de `/admin`), botón "Ver menú y pedir", horario,
mapa, Instagram/Facebook y WhatsApp. Paleta y tipografía en
`docs/diseno.md`.

## 9. Variables de entorno (previstas)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`, `NOTIFY_EMAIL`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, y para
Instagram: `META_APP_SECRET`, `IG_ACCESS_TOKEN`, `IG_VERIFY_TOKEN`.

## 10. Contenido

### 10.1 Fotos de ejemplo

Mientras Franco comparte el material oficial, el seed usa fotos de
`../Publicaciones/` y `../Servicios/` (mapa de archivo → producto en
`docs/diseno.md`).

### 10.2 Ojo con las historias de clientes

Las imágenes `Recomendacion*.png` son **historias de Instagram de
clientes**, con su usuario y textos encima (se recortó el encabezado
con el usuario). **El usuario decidió publicarlas así por ahora**
(2026-10-06), hasta tener fotos oficiales (P3).

## 11. Pruebas

Vitest para la lógica pura: total del pedido (tamaños + extras +
envío), mínimo de domicilio, horas disponibles para programar, matriz de
pagos y transiciones de estado. Casos manuales y con `curl` para el
webhook de Stripe (modo de prueba) en `docs/pruebas.md`.

## 12. Pendientes

| # | Pendiente | Desde |
|---|---|---|
| P1 | Correo del negocio (dueño de Vercel, Supabase, Google y Stripe; recibe avisos) | 2026-10-06 |
| P2 | Menú real: nombres, precios, tamaños y extras (los extras actuales son inventados) | 2026-10-06 |
| P3 | Fotos oficiales de producto (mientras, se publican las historias recortadas) | 2026-10-06 |
| P14 | ¿Hasta cuántos días adelante se puede programar? (7 por defecto, editable) | 2026-10-06 |
| P8 | Datos de transferencia (CLABE, banco, titular) | 2026-10-06 |
| P9 | Alta de Stripe a nombre de Franco (RFC, cuenta bancaria, identificación) | 2026-10-06 |
| P10 | Instagram: cuenta profesional y acceso a Meta Business (ver `docs/instagram.md`) | 2026-10-06 |
| P11 | Dominio propio (opcional) | 2026-10-06 |
| P13 | Responsable legal para `/privacidad` y `/terminos` (¿Franco García como persona física?) | 2026-10-06 |
