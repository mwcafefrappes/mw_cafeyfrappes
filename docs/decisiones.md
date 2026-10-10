# Decisiones — MW Café & Frappés

## 2026-10-06 — Respuestas a los pendientes P3–P7

- **Fotos (P3):** las historias de clientes (recortadas) se publican por
  ahora, hasta tener fotos oficiales.
- **Menú (P4):** se agregan **Crepas** y **Sodas italianas** al seed, con
  sus propios grupos de extras (inventados, `is_sample`).
- **Dirección (P5):** la de Instagram ("Sector K, sobre la calle
  boulevard Guelaguetza"), editable desde `/admin`.
- **Programados (P7):** anticipación mínima 2 h, una hora cada 30 min,
  máximo 5 pedidos por franja, se puede programar otro día pero solo en
  días y horas de apertura. Todo editable (`scheduled_*` en
  `business_settings`). Se agregó un tope de días adelante
  (`scheduled_max_days_ahead`, 7) para que la lista de horas no sea
  infinita; confirmar el número (P14).
- **Envío (P6):** $40 por defecto, editable, con switch
  **automático/manual** (`delivery_fee_mode`): automático cobra el envío
  fijo; manual deja que la tienda lo fije en cada pedido. Reparte el
  dueño. Falta definir zona de entrega.

## 2026-10-06 — Fase 1: base del proyecto

- **Se copió de Axel solo lo genérico** (stack, `/admin`, PWA, SEO,
  legales, teléfono y formato de hora). Gmail, Calendar y Google Auth se
  quitaron por ahora y vuelven en la Fase 5.
- **Tokens por función** (`brand-primary`, `brand-accent`…) en vez de
  por color (`brand-olive` de Axel), para que cambiar la marca no
  obligue a renombrar clases.
- **Tema:** el sitio sigue el tema del sistema (MW abre de noche: mucha
  gente lo verá en oscuro). `/admin` conserva el botón sol/luna; sin
  cookie arranca en claro. La variante `dark:` de Tailwind respeta los dos.
- **Precios en centavos** (`integer`) y **tamaños con precio completo**
  (no "+$15 sobre el base"), para que el total sea una suma simple.
- **Agotado ≠ oculto:** `is_available = false` se ve marcado como
  agotado; `active = false` no aparece. Lo hacen cumplir las policies.
- **Fotos de ejemplo en `public/sample`** (no en Storage): `photo_path`
  que empieza con "/" se usa tal cual. Al subir la foto real desde
  `/admin` se reemplaza por la ruta de Storage. A las historias de
  clientes se les recortó el encabezado con el usuario (siguen siendo
  solo para el demo, P3).
- **Dirección provisional:** la del flyer (Guelaguetza 8C, Villas
  Paraíso) hasta confirmar P5.
- **Contacto legal:** el WhatsApp del negocio hasta tener correo (P1).
- **Supabase local en puertos 553xx** para poder tenerlo encendido junto
  al de Axel.
- **Portada provisional** en `/` mientras llega la landing (Fase 3):
  identidad, favoritos de la BD, horario y ubicación.

## 2026-10-06 — Alcance inicial

Respuestas del usuario a las preguntas de arranque:

- **Base técnica:** se reutiliza Axel Style (stack, `/admin`, Gmail,
  Calendar, PWA, SEO, docs). No se copia el bot de WhatsApp ni la agenda.
  Proyecto independiente; Vyxorian Studios es la empresa del desarrollador.
- **Marca:** MW es la extensión de **Mundo Waffle Huatulco**, que es la
  tienda principal.
- **Menú:** Waffles, Café y Frappés, más extras. Los extras se inventan
  por ahora y se marcan como ejemplo.
- **WhatsApp:** solo botón de contacto, sin bot.
- **`/admin`:** Franco García (dueño) y el desarrollador.
- **Horario:** jueves a domingo, 7:00 pm a 11:00 pm (confirmado).
- **Pedidos:** se pide desde el menú para mostrador, mesa o domicilio.
  Domicilio con mínimo de **$80 MXN**.
- **Pagos:** domicilio con **Stripe Checkout** (con Google Pay y Apple
  Pay). Mostrador y mesa con efectivo o transferencia, cobrados a mano.
  Qué métodos se ofrecen en cada tipo es configurable en `/admin`.
  Motivo: el riesgo de no cobrar un domicilio es alto; en el local se
  cobra en persona.
- **Google Calendar:** se usa para **pedidos programados** (el cliente
  elige a qué hora recoge).
- **Instagram:** al final del proyecto, aún no confirmado. Respuestas
  configurables en `/admin` (agregar, quitar y editar), con mensaje
  genérico cuando nada coincide.
- **3D:** piloto con affogato, frappé y café, de calidad media al
  inicio; se perfecciona con el tiempo.
- **Prioridad:** menú y landing, luego `/admin`, luego pedidos; al final
  Stripe e Instagram. Sin fecha límite, cuanto antes mejor.
- **Correo del negocio:** pendiente (P1).

## 2026-10-06 — Estudio de QR

Se adaptó el artefacto "Estudio de QR" del usuario para MW:
https://claude.ai/artifact/5ze7M1jtJog4Cdfih3PDRy

- Logo MW recoloreado a café espresso sin fondo (el original es blanco
  sobre negro y se perdería en un QR claro).
- Paletas: Espresso, Kraft, Rosa terraza, Tinta, Noche MW.
- **Campo "Número de mesa"**: agrega `?mesa=N` al enlace y cambia el
  título a "Mesa N". Sin número sirve para el mostrador o la publicidad.
- La URL por defecto (`https://mw-cafeyfrappes.vercel.app/menu`) es
  provisional hasta crear el proyecto de Vercel.
- Más adelante el estudio se porta a `/admin/qr`.

## 2026-10-07 — Menú digital (Fase 2)

- **Fuera de horario el menú se ve completo**, con el aviso "Abrimos
  … a las …" (CLAUDE.md 5.2). El pedido programado se suma en la Fase 5.
- **Mesas 1 a 99** en `?mesa=N` mientras no sepamos cuántas hay (P12);
  cualquier otro valor se ignora. Motivo: un QR mal impreso o editado a
  mano no debe romper el menú.
- **Detalle con total pero sin botón de pedir** hasta la Fase 5, con el
  texto "Muy pronto vas a poder pedir desde aquí". Motivo: el orden
  acordado es menú → landing → /admin → pedidos.
- El filtro Frío/Caliente usa las etiquetas del producto: un producto
  sin ninguna de las dos (p. ej. crepas) solo aparece en "Todo".

## 2026-10-08 — Landing (Fase 3)

- Textos por defecto propuestos por el desarrollador, editables en
  `/admin/landing`; **pendientes de revisión de Franco**: portada "Café,
  frappés y waffles", "Somos parte de Mundo Waffle", "Te esperamos por la
  noche", "¿Dudas o pedidos especiales?".
- Portada con la foto de la terraza y "Quiénes somos" con la de la barra
  (de `../Publicaciones`), hasta tener fotos oficiales (P3).
- Hasta 6 favoritos en la portada; el resto en `/menu`.
- Mapa embebido de Google sin llave de API (gratis).

## 2026-10-08 — `/admin/menu` (Fase 4)

- **Agotado y oculto con un clic** desde la lista, sin entrar al producto
  (lo más usado en el día a día).
- **Temperatura como opción única** (No aplica / Frío / Caliente) para
  que un producto no quede en los dos filtros.
- **Con tamaños, el precio base se guarda igual al del tamaño más
  barato** (no se usa para cobrar; evita un precio en 0).
- **Fotos reducidas en el navegador** a 1600 px JPG antes de subir:
  cuida el 1 GB gratis de Storage y el límite de 4.5 MB de Vercel.
- **Una categoría con productos no se puede borrar** (se oculta o se
  vacía primero). Borrar un grupo de extras sí borra sus extras, con
  confirmación que dice cuántos productos lo usan.
- Guardar un producto le quita la marca de "ejemplo".

## 2026-10-08 — `/admin/negocio` (Fase 4)

- **Domicilio y tarjeta no se pueden activar sin Stripe** (Fase 6): el
  domicilio se paga solo con tarjeta (CLAUDE.md 5.3), así que sin cobro
  en línea no tendría cómo pagarse.
- **Domicilio no ofrece efectivo ni transferencia** (la tabla de
  CLAUDE.md 5.3 no los marca como activables).
- **Mostrador y mesa deben tener al menos un método** de pago.
- **Si se ofrece transferencia sin CLABE** se avisa en el panel, pero se
  deja guardar (los datos de transferencia están pendientes, P8).
- **CLABE con dígito verificador**: evita que un número mal copiado
  llegue al cliente.
- **WhatsApp se guarda como 52 + 10 dígitos** (formato de `wa.me`).
- El "logo" editable se llama **"Ícono del sitio"** en el panel, porque
  solo cambia la pestaña, la vista al compartir y el panel.

## 2026-10-08 — `/admin/horario` (Fase 4)

- **Un horario por día** (abre y cierra), sin turnos partidos: MW abre
  una sola vez por noche. Si hace falta, se agrega después.
- **Cierre después de medianoche permitido** (de 7:00 p. m. a 1:00 a. m.
  cuenta como abierto hasta la 1 del día siguiente).
- **Se pueden cerrar todos los días** (vacaciones): el sitio dice
  "Cerrado" sin fecha de apertura. El panel lo avisa.
- **Un solo formato de hora para todo el sitio** (en Axel había uno para
  la web y otro para WhatsApp; aquí no hay bot).
- Pendiente de confirmar: cierres por fecha (días festivos, vacaciones
  con fecha de regreso, "hoy no abrimos").

## 2026-10-08 — `/admin/landing` (Fase 4)

- **En el panel se llama "Portada"** (no "Landing", que es jerga); la
  primera sección se llama "Encabezado".
- **Solo textos y fotos**; el diseño y el orden de las secciones siguen
  fijos. Llevan foto el encabezado y "Quiénes somos" (las demás no la
  usan en el diseño).
- **Borrar un texto, o dejarlo igual al original, guarda "original"**:
  si después se mejora el texto por defecto, la portada lo toma sola.
- **Favoritos: máximo 6, en el orden del menú.** Se eligen en Menú; la
  página de Portada solo muestra cuáles salen y avisa si sobran.
- Fotos de portada a 2000 px JPG (se ve a lo ancho en computadora).
- Pendiente: video (reel) en el encabezado, si Franco lo quiere.

## 2026-10-08 — `/admin/qr` (Fase 4)

- **6 mesas por ahora, editable en el panel** (confirmado por el usuario;
  cierra P12). Columna `business_settings.table_count` (1 a 99). `?mesa=`
  sigue aceptando 1 a 99; al pedir (Fase 5) se validará contra este número.
- **El estudio es el mismo del artefacto**, ahora dentro del panel y con
  `qr-code-styling` instalado en el proyecto (no desde un CDN).
  Tipografías: las del sitio (Playfair + Figtree) en vez de Montserrat,
  Poppins y Plex Mono, para no cargar letras extra.
- **En las mesas el título es "Mesa N" y se pone solo**; la invitación de
  mesa y la del mostrador se escriben por separado.
- **El diseño se recuerda en el navegador** (no en la base): es para
  imprimir de vez en cuando, no un dato del negocio. El logo subido no se
  guarda; el de MW viene por defecto.
- **"Descargar las N mesas"** baja una tarjeta por mesa (el navegador
  puede pedir permiso para varias descargas).
- **Aviso si la dirección del sitio es local** y recordatorio de que, si
  cambia el dominio (P11), hay que reimprimir los QR.

## 2026-10-08 — `/admin/metricas` (Fase 4)

- **Contadores propios en Supabase** (elegido por el usuario): el plan
  gratis de Vercel Analytics no cuenta eventos propios. Se cuentan
  visitas al menú, escaneos por mesa, productos más vistos y clics a
  WhatsApp y redes (los cuatro, confirmados). Las visitas generales y de
  dónde llegan siguen en Vercel Analytics.
- **Solo conteos por día** (día + métrica + clave + número): nada de
  quién, ni IP, ni cookies nuevas. Así no hay que borrar datos viejos y
  la tabla pesa unos KB al mes. Se agregó una línea al aviso de privacidad.
- **La mesa cuenta solo si viene en el QR** (`?mesa=` en la URL), no la
  recordada de una visita anterior.
- **No se cuentan navegadores con la cookie del panel** (aunque ya se
  haya salido): las pruebas y los teléfonos del negocio no inflan los
  números.
- La ruta acepta solo métricas y claves conocidas (mesa 1–99, id de
  producto, 4 enlaces); lo demás se ignora. Alguien podría inflar los
  conteos a propósito; para un negocio de este tamaño se acepta.

## 2026-10-08 — Pedidos (Fase 5)

Confirmado por el usuario:
- **Domicilio se hace en la Fase 6**, junto con Stripe: se paga solo con
  tarjeta.
- **Mesa solo "ahora"**; programar es solo para recoger.
- **Transferencia: el cliente sube su comprobante** en `/pedido/<token>`
  y el pedido **no se prepara hasta que el personal confirma el pago**.
- **El cliente puede cancelar mientras el pedido siga "recibido"**;
  después, por WhatsApp.
- **Notas por producto y nota general** del pedido.
- **Número por día** (#1, #2…), del día en que se entrega: un programado
  para mañana toma el número de mañana.
- **Correo y Calendar listos, inactivos hasta tener la cuenta de Google**
  (P1): sin llaves, el aviso queda en el log y el pedido se crea igual.

Decidido al implementar:
- **Carrito en el navegador** (sin cuenta); el servidor recalcula todo
  al pedir y explica qué cambió (agotado, hora llena, cerró).
- **El cliente sigue su pedido con actualización cada 10 s** (no con
  Realtime): así la tabla de pedidos nunca se abre al público. El tablero
  del panel sí usa Realtime (solo cuentas de `admin_users` pueden leer).
- **Comprobantes en un bucket privado**; el panel los ve con enlaces que
  caducan en 1 hora. Las capturas se reducen a 2000 px antes de subir.
- **Sonido del tablero:** hay que tocar "Activar sonido" cada vez que se
  abre (los navegadores no dejan sonar sin un toque).
- **Programados en el tablero:** salen en "Nuevos" desde una hora antes de
  su hora; antes, en "Programados para más tarde".
- **Cambios del personal condicionados** al estado que vio: si otro
  dispositivo ya lo movió, se avisa en vez de pisarlo.
- **Un "pagado" de transferencia no se puede desmarcar** si ya se empezó
  a preparar.
- Cualquiera con el link del menú puede hacer pedidos (no hay cuenta):
  un pedido falso se cancela desde el tablero. Si se vuelve un problema,
  se agrega un límite.
- Cuánto tiempo guardar pedidos y comprobantes: decidido el 2026-10-09 (ver abajo).

## 2026-10-09 — Domicilio (Fase 6, sin el cobro)

Confirmado por el usuario:
- **Envío manual:** el pedido llega al tablero como "falta poner el
  envío"; el personal escribe el costo y el cliente paga desde su pedido.
  No se prepara hasta que pague.
- **Un pedido con tarjeta sin pagar no sale en el tablero**; si no se paga
  en 1 hora se cancela solo. (En envío manual sí sale, porque la tienda
  tiene que poner el costo.)
- **Dirección:** calle y número, colonia, referencias y un **pin en un
  mapa** (OpenStreetMap, gratis), con "Usar mi ubicación" opcional.
- **Zona de entrega: radio de 5 km** desde el local, editable en
  `/admin/negocio` (resuelve P6).

Decidido al implementar:
- El radio se mide **en línea recta** desde la latitud y longitud del
  local (`/admin/negocio` → Ubicación). Sin ubicación, no hay domicilio.
- El **mínimo ($80) es sin el envío**.
- El pin queda fijo al centro y el cliente mueve el mapa (como las apps de
  transporte); el punto solo cuenta cuando el cliente mueve el mapa o usa
  su ubicación.
- La **cancelación automática** se hace al abrir el carrito o la página
  de un pedido (no hay cron extra: Vercel Hobby solo da uno al
  día). Se marca como cancelado "por el sistema".
- **El cliente no puede cancelar un pedido ya pagado con tarjeta**: lo
  cancela el personal para regresarle el dinero (reembolso con Stripe).
- El correo al negocio de un pedido con tarjeta sale **al pagarse**; el de
  envío manual, al llegar (para poner el envío).
- El número del día se asigna al crear el pedido: si alguien no paga, ese
  número se salta.
- En el tablero, el botón de "listo" de domicilio dice "Salió a entregar"
  y el cliente ve "¡Va en camino!".
- El sonido del tablero ahora suena cuando **aparece** un pedido nuevo en
  "Nuevos" (también uno con tarjeta que se acaba de pagar).

## 2026-10-09 — Stripe Checkout (Fase 6, sin cuenta todavía)

Pedido por el usuario: avanzar todo el código antes de tener la cuenta.

Decidido al implementar:
- Librería oficial `stripe` 22.6.2 (la 23 salió hace una semana).
- **Al hacer un pedido con tarjeta se va directo a la página de pago de
  Stripe**; si no se pudo abrir, a su pedido, donde está "Pagar".
- Página de pago en español (`es-419`), con un renglón por producto
  (tamaño, extras y nota) y el envío. Si los renglones no suman el total
  guardado, se cobra un solo renglón "Pedido #N" por el total.
- **Plazo para pagar:** 60 min desde el pedido; Stripe exige que su
  página dure al menos 30 min, así que si alguien toca "Pagar" al final
  del plazo se alarga lo necesario (`pay_by`) para no cancelarle mientras
  paga. Con envío manual, 60 min desde que toca "Pagar".
- **Solo el webhook marca pagado** (CLAUDE.md 5.3). Al volver de Stripe
  el cliente ve "Estamos confirmando tu pago…" hasta que llega el aviso.
- Si llega el pago de un pedido que ya se canceló, **se reembolsa solo**.
- **El personal cancela un pedido pagado → primero el reembolso**; si
  Stripe falla, el pedido no se cancela y se avisa. Reembolso completo
  (no hay reembolsos parciales).
- Al cancelar un pedido sin pagar (cliente o personal), se cierra su
  página de pago para que ya no se pueda pagar.
- La dirección de regreso de Stripe es el mismo sitio desde el que se
  pagó (producción, preview o local).

## 2026-10-09 — Comprobantes, 3D y manual

Confirmado por el usuario:
- **Las capturas de comprobantes se guardan 90 días** por defecto,
  editable en `/admin/negocio` (Métodos de pago). Las borra el cron
  diario; el pedido se queda para el historial y las métricas.
- Siguiente trabajo: 3D/AR y el manual de Franco (Instagram sigue sin
  confirmar).

Decidido al implementar:
- Días permitidos para comprobantes: de 7 a 3650. El aviso de privacidad
  muestra el número actual.
- `@google/model-viewer` 4.3.1 (gratis, de Google) con `three` 0.183.2.
  Se descarga solo cuando el cliente toca "Ver en 3D".
- **Los modelos se suben directo a Supabase Storage** con un permiso
  firmado de un solo uso: Vercel corta las subidas a 4.5 MB y un modelo
  puede pesar más. El servidor revisa que el archivo exista y su tamaño
  antes de ligarlo. Máximo 10 MB (el tope del bucket); aviso arriba de
  4 MB (la meta de `docs/3d-ar.md`).
- El navegador revisa que el archivo de verdad sea `.glb` o `.usdz` (los
  primeros bytes) antes de subirlo.
- Quitar el `.glb` quita también el `.usdz`.
- "Ver en tu mesa" usa realidad aumentada a **tamaño real** (`ar-scale`
  fijo): los modelos deben venir en metros.

## 2026-10-09 — App instalada (PWA)

Confirmado por el usuario:
- La app instalada abre en el **menú** (`start_url: /menu`); el `id` del
  manifest sigue en `/` para no duplicar instalaciones existentes.
- Atajos al dejar presionado el ícono (Android): **Menú** y **Mis
  pedidos** (`/mis-pedidos`, los pedidos de las últimas 12 horas que
  recuerda ese celular).
- Ofrecer "Instalar app" en el **menú** (aviso que se puede cerrar), **al
  terminar un pedido** (`/pedido/<token>`) y en la portada (ya estaba).

Decidido al implementar:
- El aviso del menú y del pedido sale **solo en celular** (Android o
  iPhone) y nunca dentro de la app instalada. Si el cliente lo cierra, no
  vuelve a salir en ninguno de los dos lugares (se recuerda en el
  celular). La sección de la portada se queda siempre.
- `/menu` entra al caché inicial del service worker para que la app abra
  sin señal; `/mis-pedidos` no se indexa en Google.
- En iPhone, la app instalada guarda sus datos aparte de Safari: un
  pedido hecho en Safari no aparece en "Mis pedidos" de la app (límite de
  Apple).
