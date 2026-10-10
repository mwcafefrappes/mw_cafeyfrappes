# Pruebas

> Creado 2026-10-06 (Fase 1).

## Automáticas

```bash
pnpm test         # vitest
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

| Archivo | Cubre |
|---|---|
| `lib/money.test.ts` | Formato de precios, captura de montos, "desde $X" con tamaños |
| `lib/weekly-hours.test.ts` | Leer horario, "Jueves a domingo", abierto/cerrado en hora de México, cierre después de medianoche |
| `lib/menu.test.ts` | Búsqueda sin acentos, filtro frío/caliente, `?mesa=N` válido, "Abrimos hoy / mañana / el jueves" |
| `lib/item-price.test.ts` | Precio de un producto con tamaño y extras, agotado, extras ajenos o repetidos, mínimo y máximo por grupo |
| `lib/landing-content.test.ts` | Textos de la landing: lo guardado manda, vacío cae al valor por defecto; links de Google/Apple Maps |
| `lib/admin/menu-form.test.ts` | Formularios de `/admin/menu`: precio en centavos, tamaños (vacíos, repetidos, precio inválido), frío y caliente a la vez, mínimo/máximo de extras, slugs, mover arriba/abajo |
| `lib/orders.test.ts` | Pedidos: forma (recoger con nombre y teléfono, mesa sin teléfono y solo "ahora", domicilio con teléfono, dirección y punto en el mapa, cantidades 1–20), **total en el servidor** (tamaño + extras × cantidad), agotados y extras inválidos con el nombre del producto, reglas (cerrado = solo programado, horario sin lugar, tipo apagado, mesa inexistente, matriz de pagos, domicilio fuera del radio o apagado), **envío y mínimo** (automático $40, manual sin envío, mínimo sin contar el envío), quién sale en el tablero, **estados** (recibido → preparando → listo → entregado, transferencia y tarjeta sin preparar hasta pagar, envío manual antes de pagar, quién puede cancelar) |
| `lib/card-payment.test.ts` | Plazo para pagar (60 min, mínimo de Stripe de 31 min, envío manual), renglones de la página de pago (producto, tamaño, extras, nota, envío; si no suman el total, un solo renglón), monto y moneda pagados |
| `lib/models.test.ts` | Modelos 3D: formato `.glb` / `.usdz` por sus primeros bytes, ruta en Storage solo de ese producto y tipo, máximo 10 MB y aviso arriba de 4 MB |
| `lib/retention.test.ts` | Fecha de corte de comprobantes y días permitidos (7 a 3650) |
| `lib/time-ago.test.ts` | "hace un momento", "hace 25 min", "hace 2 h" (Mis pedidos) |
| `lib/geo.test.ts` | Distancia en línea recta, coordenadas válidas, "850 m" / "3.2 km", enlace a Maps |
| `lib/order-slots.test.ts` | Horas programables: 2 h de anticipación, cada 30 min, solo días que abren, hasta N días, horario lleno con 5, horas inventadas, cierre después de medianoche |
| `lib/order-format.test.ts` | "Hoy / Mañana / Domingo 11 oct", hora en el formato del negocio, renglón del pedido, teléfono |
| `lib/metrics.test.ts` | `/admin/metricas`: métricas y claves válidas (mesa 1–99, id de producto, 4 enlaces), periodo de 7/30/90 días, "hoy" en hora de México, suma por día, mesa, producto y enlace dentro del periodo |
| `lib/qr.test.ts` | `/admin/qr`: enlace con `?mesa=N` o sin mesa, hueco del logo (impar, dentro de lo que la corrección recupera, sin tocar las esquinas), contraste y avisos de color, nombres de archivo, usuario de Instagram |
| `lib/admin/landing-form.test.ts` | `/admin/landing`: espacios y renglones, vacío o igual al original = `null`, sección desconocida, largos máximos, qué secciones llevan foto |
| `lib/admin/business-form.test.ts` | `/admin/negocio` y `/admin/horario`: días y horas (solo días abiertos, segundos del navegador, cierre después de medianoche, misma hora rechazada, todos cerrados), formato de hora, número de mesas (1 a 99); WhatsApp a 52 + 10 dígitos, dígito verificador de la CLABE, domicilio y tarjeta solo con Stripe, al menos un método por tipo, envío en centavos, rangos de programados, matriz de pagos guardada (`lib/payment-methods.ts`) |
| `lib/time-format.test.ts` | Formatos de hora (heredado de Axel) |
| `lib/phone.test.ts` | Normalizar teléfonos mexicanos (heredado de Axel) |

## RLS (manual, contra Supabase local)

Con `pnpm exec supabase start` y la anon key:

```bash
ANON=<anon key>
q(){ curl -s "http://127.0.0.1:55321/rest/v1/$1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"; echo; }
q "products?select=slug,is_available"      # todos los activos, agotados incluidos
q "admin_users?select=*"                    # [] (anon no ve la lista blanca)
```

Verificado 2026-10-06: un producto con `active = false` desaparece; una
categoría inactiva oculta sus productos; un agotado sigue apareciendo
con `is_available = false`.

## Cron

```bash
curl -i localhost:3000/api/cron/daily                                  # 401
curl -i -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/daily   # 200 {"ok":true,"proofsDeleted":0}
```

Verificado 2026-10-09 contra Supabase local: un pedido de hace 100 días y
otro de hace 10, cada uno con comprobante → `{"ok":true,"proofsDeleted":1}`;
se borró solo el viejo (el archivo ya no existe y el pedido queda sin
comprobante), el de 10 días sigue.

## 3D (manual, contra Supabase local)

Verificado 2026-10-09 con una taza de prueba de 12 KB generada por script
(9 cm de alto, sin descargar nada):
- `/admin/menu/producto/<id>` → "Vista 3D" → subir el `.glb` → "Modelo 3D
  listo.", vista previa girando y botones "Cambiar modelo .glb", "Subir
  versión para iPhone (.usdz)" y "Quitar modelo 3D".
- Un archivo de texto con nombre `.glb` → "Ese archivo no es un modelo
  .glb." (no se sube).
- `/menu?producto=waffle-en-cono` en celular (375 px) → botón "Ver en 3D"
  sobre la foto → la taza en 3D y "Ver en tu mesa"; "Ver foto" regresa.
- **Pendiente en celulares reales:** Scene Viewer (Android) y Quick Look
  (iPhone), y el tiempo de carga con 4G.

## Menú (`/menu`, manual)

Verificado 2026-10-07 contra Supabase de producción, en celular (375 px)
y escritorio, claro y oscuro:

- `/menu?mesa=4` → "Mesa 4" arriba; `sessionStorage["mw-mesa"] = "4"`.
- Cerrado (miércoles) → "Abrimos mañana a las 7:00 p. m."
- Buscar "nutella" → solo "Crepa de Nutella". Filtro Frío → frappés y sodas.
- Frappé moka: 20 oz ($85) + Galleta Oreo ($12) → total $97.
- "Atrás" cierra el detalle y deja `?mesa=4`; Esc en un link compartido
  (`?producto=crepa-nutella`) lo cierra y quita el parámetro.
- Al hacer scroll a Frappés, el chip "Frappés" se marca.
- Sin errores en consola.

Agotado verificado 2026-10-08: marcado en `/admin/menu` → en el menú
sale "Agotado" y el detalle dice "Agotado por ahora".

## Landing (`/`, manual)

Verificado 2026-10-08 (jueves por la tarde) en celular oscuro y escritorio claro:
"Cerrado · abrimos hoy a las 7:00 p. m.", 4 favoritos con link a su
detalle, mapa embebido, botones de mapas, contacto e instalar app. Sin
errores en consola.

## `/admin/menu` (manual, contra Supabase local)

Para no tocar producción: `pnpm exec supabase start` y
`node scripts/dev-local.mjs` (o el preview "mw-cafe-local"). Cuenta de
prueba local creada con el admin API (solo existe en Docker).

Verificado 2026-10-08:
- Crear "Frappé de prueba QA" en Frappés con 16 oz $72.50 y 20 oz $88 y
  el grupo "Extras de frappé" → slug `frappe-de-prueba-qa`, precio base
  7250, `is_sample = false`, visible en `/menu`.
- Foto de 4000×3000 PNG (233 KB) → se sube como JPG de ~80 KB; al
  cambiarla se borra la anterior de Storage (queda 1 archivo).
- Quitar el tamaño 20 oz y guardar → queda solo 16 oz.
- Marcar agotado / "Ya hay" desde la lista; subir Café sobre Waffles →
  el menú público cambia de orden al momento.
- Grupo con mínimo 3 y máximo 2 → "El máximo no puede ser menor que el mínimo."
- Borrar el producto (con confirmación) → desaparece con su foto.

## `/admin/negocio` (manual, contra Supabase local)

Verificado 2026-10-08:
- CLABE con dígito verificador mal → "La CLABE no es válida…"; con
  espacios y bien → se guarda sin espacios.
- Quitar transferencia en mesa → `payment_methods.table = ["cash"]`;
  domicilio queda `["card"]`.
- Mínimo $90, envío $45.50, manual → 9000 / 4550 / `manual`.
- WhatsApp "+52 (958) 186-1260" → `529581861260`.
- Subir ícono → aparece en el panel; "Volver al ícono de MW" lo quita y
  lo borra de Storage.
- Sin `STRIPE_SECRET_KEY`: el switch de domicilio y la columna de tarjeta
  salen deshabilitados.
- Al final se regresaron los valores originales en la BD local.

## `/admin/horario` (manual, contra Supabase local)

Verificado 2026-10-08:
- Abrir el lunes 9:00–14:00 y cerrar el viernes a la 1:00 → la portada
  muestra "Lunes", "Jueves", "Viernes 7:00 p. m. – 1:00 a. m." y "Sábado y
  domingo".
- Formato "7 de la tarde" → la portada y el aviso de "Abrimos…" cambian
  al momento.
- Jueves de 19:00 a 19:00 → "El jueves abre y cierra a la misma hora."
- En celular (375 px) cada día queda en dos renglones, sin scroll de lado.
- Al final se regresó jueves a domingo 19:00–23:00 y formato 12 h.

## `/admin/landing` (manual, contra Supabase local)

Verificado 2026-10-08:
- Título "Prueba   de título" con texto vacío → la portada muestra "Prueba
  de título" y el texto original.
- Subir una foto de 3000×2000 a "Quiénes somos" → se guarda JPG de
  2000×1333 (27 KB) y sale en la portada.
- "Volver a la foto original" → regresa la foto de ejemplo y el archivo se
  borra de Storage.
- Volver a escribir el título original → se guarda como `null`.
- Al final: `landing_sections` sin valores propios y `site-assets` vacío.

## `/admin/qr` (manual, contra Supabase local)

Verificado 2026-10-08 (los QR se decodificaron con jsQR en el navegador):
- Mesa 1, Mesa 4 y Mostrador → `…/menu?mesa=1`, `…/menu?mesa=4` y
  `…/menu`, con el logo MW al centro y corrección alta.
- Diseño difícil (puntos, colores "Noche MW", logo al 45 %, corrección
  media) → se sigue leyendo; sale el aviso de QR claro sobre fondo oscuro.
- Descargas: `mesa-2-qr.svg`, `mesa-2-tarjeta.png`, `mesa-2-qr.png` y
  "Descargar las 6 mesas" → `mesa-1-tarjeta.png` … `mesa-6-tarjeta.png`.
- Mesas 8 → aparecen Mesa 1…8; se regresó a 6.
- Al recargar, el diseño se conserva; "Regresar al diseño original" lo limpia.
- Con la dirección del sitio en localhost sale el aviso "solo funciona en
  esta computadora".
- En celular (375 px) la vista previa va primero, sin scroll de lado.

## Pedidos (manual, contra Supabase local)

Verificado 2026-10-08 (con el horario local abierto todo el jueves y una
CLABE de prueba; al final se borraron los pedidos y se regresó todo):
- `/menu?mesa=2` → Frappé moka 20 oz + crema, ×2, nota "poco hielo" →
  "2 × Frappé moka en tu pedido." y barra "Ver mi pedido · 2 · $190".
- `/carrito`: "En mi mesa (mesa 2)" o recoger; transferencia y nota →
  pedido #1, mesa 2, $190 calculado en el servidor; correo simulado en el
  log; el menú muestra "Tu pedido #1: ver cómo va".
- `/pedido/<token>`: "Esperando tu transferencia", CLABE, banco, titular,
  concepto. Subir captura de 1200×2400 → se guarda JPG de 28 KB en el
  bucket privado; la URL pública da 400 y la firmada del panel abre.
- Tablero (en vivo): #1 en "Nuevos" sin botón de preparar →
  "Ya llegó la transferencia" → "Empezar a preparar" → "Marcar listo"
  (el cliente ve "¡Listo! Ya va a tu mesa") → "Entregado": la página del
  cliente cambió sola a "Entregado. ¡Buen provecho!" sin recargar.
- Recoger programado para mañana 8:00 p. m., efectivo, teléfono
  "958 111 2233" → #1 del viernes (`529581112233`), en "Programados para
  más tarde"; el cliente lo cancela → "Cancelamos tu pedido.", correo
  simulado, y aparece en "Entregados y cancelados hoy".
- Horarios ofrecidos: hoy desde 2 h después, mañana y los días que abren
  hasta 7 días adelante.
- Celular (375 px): tablero y carrito sin scroll de lado.

## Domicilio (manual, contra Supabase local)

Verificado 2026-10-09 con una `STRIPE_SECRET_KEY` de relleno solo para el
servidor local (para poder activar domicilio), horario abierto todo el día;
al final se borraron los pedidos y se regresó todo:
- `/carrito` → "A domicilio": calle, referencias y mapa con el círculo de
  5 km. Mover el mapa → "Listo: 310 m del local."; muy lejos → "Ese punto
  está a 91.1 km del local, fuera de nuestra zona de entrega" y "Hacer
  pedido" no envía.
- Envío automático: Waffle $95 + envío $40 → pedido #1 de $135, "Falta
  pagar tu pedido", botón "Pagar $135" y aviso de 60 minutos. En la BD:
  `on_board = false`, 310 m. El tablero no lo muestra y no se mandó
  correo. Al marcarlo pagado en la BD (lo que hará el webhook) aparece en
  "Nuevos" con dirección, "Abrir en Maps · 310 m del local" y "incluye $40
  de envío"; "Empezar a preparar" → "Salió a entregar".
- Envío manual + programado (hoy 1:00 p. m.): pedido #2 de $90, "en un
  momento te decimos el costo del envío", "Total sin envío"; correo
  simulado. En el tablero (programados) aparece "Costo del envío $40" →
  se cambia a 35 → "Poner envío" → $125 "incluye $35 de envío", "Esperando
  a que el cliente pague con tarjeta"; el cliente ve "Pagar $125".
- Pedido con tarjeta sin pagar de hace 2 horas → al abrirlo: "Este pedido
  se canceló porque no se pagó a tiempo".
- Celular (375 px): el mapa se encuadra bien al cambiar de tamaño.

## Stripe (manual)

Verificado 2026-10-09 sin cuenta de Stripe: servidor local con llaves de
relleno y eventos armados y **firmados en local** con
`stripe.webhooks.generateTestHeaderString` (no llama a Stripe), mandados
a `/api/stripe/webhook`:
- Firma con otro secreto → 400 "Firma inválida".
- `checkout.session.completed` de un pedido con tarjeta sin pagar → 200;
  queda pagado, en el tablero, con el `payment_intent`; correo simulado
  "Pedido #1 · A domicilio · $135".
- El mismo aviso otra vez → 200 y no cambia nada (sin segundo correo).
- `checkout.session.expired` → el pedido queda cancelado "por el sistema".
- Pago de un pedido ya cancelado → intenta el reembolso (con la llave de
  relleno Stripe lo rechaza) y responde 500 para que Stripe reintente.
- "Pagar" sin llave válida → "No pudimos abrir la página de pago. Intenta
  otra vez en un momento."; con `?pagado=1` → "Estamos confirmando tu
  pago…".

**Pendiente con la cuenta de prueba (P9):** abrir la página de pago, pagar
con `4242 4242 4242 4242`, Google Pay en Android, dejar vencer una página,
cancelar desde el tablero un pedido pagado (reembolso), con
`stripe listen` en local y luego en producción.

## Métricas (manual, contra Supabase local)

Verificado 2026-10-08:
- Abrir `/menu?mesa=3` y luego Frappé moka → el servidor recibe
  exactamente una visita al menú y una apertura de producto (sin
  duplicados en desarrollo).
- Clic en WhatsApp y en "Cómo llegar" de la portada → un conteo cada uno.
- Desde un navegador que entró al panel → no se suma nada.
- `curl` sin cookies: `menu_view` mesa 3 (×2) y sin mesa, `product_view`
  (×2), `whatsapp`, `maps` → se suman en el día de hoy (hora de México).
  Mesa 500, métrica inventada, cuerpo que no es JSON, producto por slug
  y con cookie `sb-…-auth-token` → se ignoran (respuesta 204 igual).
- `/admin/metricas` con 20 días de ejemplo: totales, gráfica por día,
  más vistos, mesas y clics correctos en 7 y 30 días; en celular sin
  scroll de lado. Al final se vació `metric_counts`.

```bash
curl -i -X POST -d '{"m":"menu_view","k":"3"}' localhost:3000/api/metrics   # 204
```

## App instalada (manual, vista de celular)

Verificado 2026-10-09 en 375 px con Supabase local:
- `/menu` → aviso "Instala MW Café en tu celular…" → **Instalar** abre la
  guía (Android, paso 1 de 3) → la × lo oculta y ya no vuelve al recargar.
- `/pedido/<token>` → aviso "Instala la app para ver tus pedidos…" arriba
  de WhatsApp / Cancelar.
- `/mis-pedidos` con un pedido recordado → "Pedido #12 · hace 24 min" y
  "Ver cómo va"; sin pedidos → mensaje y "Ver el menú".
- `/manifest.webmanifest` → `start_url` `/menu` y los dos atajos;
  `/robots.txt` bloquea `/mis-pedidos`; la portada sigue con "Instala la app".
- **Pendiente en celulares reales:** instalar en Android y iPhone, que abra
  en el menú y los atajos del ícono.
