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

