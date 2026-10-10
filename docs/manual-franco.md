# Manual del panel — MW Café & Frappés

> Para Franco y quien atienda el local. Creado 2026-10-09; se actualiza
> cuando cambia algo del panel. Las partes marcadas con 🔒 todavía no
> están activas (esperan la cuenta de Stripe o la de Google).

## Entrar

1. Abre **`<tu sitio>/admin`** en el celular o la computadora.
2. Escribe tu correo y contraseña. No hay registro: solo entran las
   cuentas que dio de alta el desarrollador.
3. Arriba (o abajo, en el celular) están las secciones: **Inicio,
   Pedidos, Menú, Negocio, Horario, Portada, QR y Métricas**.

Consejo: en el celular, agrega el panel a la pantalla de inicio (en
Chrome: menú ⋮ → *Agregar a la pantalla principal*; en iPhone: Compartir
→ *Agregar a inicio*). Así se abre como una app.

---

## Pedidos (lo del día a día)

Deja abierta la pantalla **Pedidos** mientras el local esté abierto, en
una tableta o celular conectado al cargador.

### Al abrir

- Toca **🔕 Activar sonido**. Los navegadores no dejan sonar sin un toque,
  así que hay que hacerlo **cada vez que se abre** la pantalla. Suena un
  "ding" de prueba; cuando dice **🔔 Sonido activado**, ya quedó.
- Arriba debe decir **"En vivo: los pedidos nuevos aparecen solos."** Si
  dice "Sin conexión en vivo", igual se actualiza cada 30 segundos.

### Las columnas

| Columna | Qué hay |
|---|---|
| **Nuevos** | Pedidos que acaban de llegar (y programados que faltan menos de 1 hora) |
| **Preparando** | Lo que ya empezaste |
| **Listos** | Esperando que lo recojan, que vaya a la mesa o que salga a domicilio |
| **Programados para más tarde** | Pedidos para otra hora u otro día |
| **Entregados y cancelados hoy** | Lo cerrado del día (toca para abrir) |

Cada tarjeta trae: número del día (#1, #2…), tipo (mesa, recoger o
domicilio), nombre, teléfono (tócalo para abrir WhatsApp), productos con
tamaño, extras y notas ("poco hielo"), la nota del pedido, el total y
cómo paga.

### Los botones

1. **Empezar a preparar** → pasa a Preparando.
2. **Marcar listo** → el cliente ve "¡Listo!" en su celular. A domicilio
   dice **Salió a entregar** y el cliente ve "¡Va en camino!".
3. **Entregado** → se cierra.
4. **Cancelar** → pide confirmación. Si ya pagó con tarjeta, el dinero se
   le regresa solo a su tarjeta 🔒.

### Cómo paga cada quien

- **Efectivo:** cobra al entregar y toca **Marcar pagado** (también se
  puede después de "Entregado").
- **Transferencia:** el pedido **no se puede preparar** hasta confirmar
  el pago. El cliente sube su comprobante: toca **Ver comprobante**,
  revisa en tu banco que **sí llegó el dinero** y toca **Ya llegó la
  transferencia**. Ahí aparece "Empezar a preparar".
- **Tarjeta, Google Pay o Apple Pay** 🔒: el pedido aparece en el
  tablero **solo cuando ya está pagado**. No hay que hacer nada con el
  pago.

### Domicilio 🔒

- La tarjeta muestra la dirección, las referencias, **Abrir en Maps** (el
  punto que marcó el cliente) y a cuántos km está.
- Si el envío está en **manual**, el pedido llega con un cuadro **Costo
  del envío**: escribe cuánto es y toca **Poner envío**. El cliente ve el
  total y paga; mientras, dice "Esperando a que el cliente pague con
  tarjeta". Si no paga, cancélalo.

### Cosas que pasan solas

- Un pedido con tarjeta que no se paga en 1 hora se cancela solo.
- El cliente puede cancelar su pedido mientras siga en **Nuevos**
  (recibido); después tiene que escribirte por WhatsApp.
- Las capturas de comprobantes se borran solas a los 90 días (se cambia en
  Negocio → Métodos de pago).
- Correo a tu bandeja por cada pedido nuevo o cancelado y evento en tu
  Google Calendar para los programados 🔒 (cuando esté la cuenta de
  Google del negocio).

---

## Menú

Tres pestañas: **Productos, Categorías y Extras**.

### Lo más común: "se acabó"

En la lista de productos, toca **Marcar agotado**. El producto se sigue
viendo, con la etiqueta "Agotado", pero nadie lo puede pedir. Cuando
vuelva a haber, toca **Ya hay**.

**Ocultar** lo quita del menú por completo (para productos de temporada).
**Borrar producto** (dentro del producto, hasta abajo) es para siempre: mejor
usa agotado u ocultar.

### Editar un producto

Toca el producto. Ahí cambias:

- **Foto:** "Subir foto" o "Cambiar foto". Se ajusta sola; mejor con buena
  luz.
- **Vista 3D:** si tienes el modelo `.glb`, súbelo y el cliente verá
  "Ver en 3D" y, en el celular, **"Ver en tu mesa"** (la bebida aparece
  sobre la mesa con la cámara). La versión para iPhone (`.usdz`) es
  opcional. Ideal: menos de 4 MB.
- **Nombre, descripción, categoría, precio**, etiquetas (frío/caliente,
  nuevo, favorito) y **Mostrar en los favoritos de la portada**.
- **Tamaños** (p. ej. 12 oz y 16 oz, cada uno con su precio).
- **Extras:** qué grupos de extras lleva (toppings, extras de café…).

Al terminar toca **Guardar cambios** (abajo a la derecha).

Los productos con aviso amarillo de **ejemplo** tienen datos provisionales:
al guardarlos dejan de marcarse así.

### Categorías y extras

- **Categorías:** Waffles, Café, Frappés… nombre, descripción y orden.
- **Extras:** grupos reutilizables (p. ej. "Toppings de waffle") con su
  precio, mínimo y máximo que el cliente puede elegir, y "agotado" por
  extra.

---

## Negocio

Cada tarjeta se guarda por separado.

| Tarjeta | Qué se cambia |
|---|---|
| **Tipos de pedido y envío** | Activar recoger, mesa y domicilio 🔒; pedido mínimo a domicilio ($80), costo de envío ($40), envío automático o manual, zona de entrega (km alrededor del local) |
| **Métodos de pago** | Qué se acepta en cada tipo de pedido; datos para transferencia (CLABE, banco, titular); cuántos días se guardan los comprobantes |
| **Pedidos programados** | Activar, anticipación mínima (2 h), cada cuántos minutos, máximo por horario (5) y hasta cuántos días adelante (7) |
| **Contacto y redes** | WhatsApp, correo, Instagram, Facebook |
| **Ubicación** | Dirección, latitud y longitud (de aquí se mide la zona de entrega), enlace de Google Maps |
| **Sitio y Google** | Cómo aparece el sitio en Google y al compartirlo |
| **Logo** | El ícono del sitio |

Importante: si ofreces transferencia, **pon la CLABE**; si no, el cliente
no sabría a dónde pagar (el panel te avisa).

---

## Horario

- **Días y horas:** activa los días que abren y la hora de abrir y cerrar
  (si cierran después de medianoche, también se puede). Arriba ves cómo
  lo verá el cliente.
- Fuera de horario el menú se ve, pero solo deja **programar** pedidos
  para cuando abran.
- **Cómo se escribe la hora:** "7:00 p. m.", "19:00", etc.

---

## Portada

La página principal del sitio: título y texto de cada sección, foto del
encabezado y de "Quiénes somos". Si dejas un texto vacío, vuelve al
original. Los favoritos de la portada se eligen en cada producto del Menú
("Mostrar en los favoritos de la portada").

---

## QR

- **Número de mesas:** cámbialo si agregas o quitas mesas.
- Elige **mostrador** o **mesa 1, 2, 3…**, ajusta colores y texto, y
  descarga la tarjeta para imprimir (o **todas las mesas** de una vez).
- El QR de cada mesa abre el menú con esa mesa ya puesta: el cliente
  pide y se lo llevan.

---

## Métricas

Visitas al menú (y desde qué mesa), productos más vistos y clics a
WhatsApp, Instagram, Facebook y mapas; de 7, 30 o 90 días. No cuenta tus
propias visitas desde el navegador donde entraste al panel.

---

## Si algo no funciona

- **No suena:** toca otra vez "Activar sonido" y revisa el volumen.
- **Un pedido no se mueve:** recarga la página. Si dice "Alguien más ya
  cambió este pedido", otro celular ya lo movió.
- **Algo raro en el sitio:** escribe al desarrollador (Vyxorian Studios)
  con captura de pantalla y la hora.
