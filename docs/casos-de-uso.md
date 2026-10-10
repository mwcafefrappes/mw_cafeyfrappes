# Casos de uso — lo que hace el cliente

> Creado 2026-10-07 (Fase 2). Un flujo por sección. Pedir, pagar en
> efectivo o transferencia y seguir el pedido: Fase 5 (2026-10-08).
> Domicilio y tarjeta (Stripe): 2026-10-09, se activan con la cuenta de
> Stripe (P9).

## 1. Ver el menú

**Cómo llega:** QR de la mesa (`/menu?mesa=4`), QR del mostrador o de la
publicidad (`/menu`), botón "Ver menú" de la portada, o un link
compartido a un producto (`/menu?producto=frappe-moka`).

1. Ve el menú por categorías (Waffles, Café, Frappés, Crepas, Sodas
   italianas) con foto, precio y etiquetas (Frío, Caliente, Nuevo,
   Favorito). Con tamaños, el precio dice "desde $70".
2. Arriba ve si está **Abierto** o **Cerrado**. Si está cerrado, un aviso
   dice cuándo abren: "Abrimos hoy / mañana / el jueves a las 7:00 p. m."
   (sigue pudiendo ver el menú).
3. Si llegó por el QR de una mesa, ve "Mesa 4". La mesa se recuerda en
   esa pestaña aunque vaya a la portada y regrese; el pedido la usa.
4. Puede **buscar** ("nutella", "frappe" sin acento) y **filtrar** Frío /
   Caliente. Si no hay resultados, un botón regresa a todo el menú.
5. La barra de categorías se queda fija arriba, salta a cada sección y
   marca en cuál va.
6. Al tocar un producto se abre el **detalle**: foto grande, descripción,
   tamaños con su precio y extras por grupo ("Opcional · hasta 4"). El
   total cambia al elegir. Elige cantidad, puede dejar una nota ("poco
   hielo") y toca **Agregar** (ver "Pedir").
7. El detalle se cierra con la ✕, tocando fuera, con Esc o con el botón
   "atrás" del celular (no se sale del menú).

**Agotado:** el producto se ve en gris con la etiqueta "Agotado" y en el
detalle dice "Agotado por ahora", sin tamaños ni extras. Un extra agotado
se ve deshabilitado con "· agotado".

**Oculto:** un producto o categoría oculto en `/admin` no aparece.

**Cambios desde `/admin`:** se ven en el menú en menos de un minuto.

## 2. Pedir

1. Desde el detalle de un producto toca **Agregar**. Sale "2 × Frappé
   moka en tu pedido." y abajo una barra **Ver mi pedido · 2 · $190**. Si
   ya tenía lo mismo (tamaño, extras y nota), se suma la cantidad.
2. En **Tu pedido** (`/carrito`) cambia cantidades o quita productos. Si
   algo se agotó o cambió en el menú mientras tanto, se marca en rojo y
   hay que quitarlo para seguir.
3. **¿Dónde lo quieres?** Si llegó por el QR de una mesa: "En mi mesa
   (mesa 2)", "Para recoger en el mostrador" o "A domicilio" (si está
   activo).
4. **¿Cuándo?** (recoger y domicilio): "Lo antes posible" (si está abierto) o
   "Programar": elige día (solo los que abren, hasta 7 días) y hora (cada
   30 min, con 2 h de anticipación). Las horas llenas (5 pedidos) salen
   deshabilitadas. Cerrado: solo puede programar. En mesa siempre es para
   ahora.
5. Escribe su **nombre** (y **teléfono** a 10 dígitos si es para
   recoger o domicilio). **Domicilio:** calle, número y colonia,
   referencias, y mueve el mapa hasta que el pin quede en su casa (o toca
   "Usar mi ubicación"); ve a cuántos metros queda del local y si está
   fuera de la zona (5 km). Abajo ve productos y envío ($40, o "te lo
   confirmamos al recibir tu pedido" si el envío es manual). Mínimo $80 sin
   contar el envío. Elige **cómo paga** (los métodos que el negocio activó para
   ese tipo) y una nota opcional.
6. Toca **Hacer pedido**. El servidor vuelve a revisar todo (abierto,
   horario con lugar, precios de ese momento) y, si algo cambió, muestra el
   motivo sin perder lo que llenó. Si sale bien, el carrito se vacía y se
   abre su pedido.

## 3. Pagar en efectivo o por transferencia

- **Efectivo:** paga al recibir; el personal lo marca pagado.
- **Transferencia:** en su pedido ve CLABE (con botón Copiar), banco,
  titular y concepto "Pedido 12". Después de transferir **sube la
  captura** (o un PDF); se reduce sola en el celular. El pedido dice
  "Esperando tu transferencia" y **no se prepara** hasta que el personal
  confirma que llegó el dinero. Puede cambiar el comprobante mientras el
  pago siga pendiente. Si el negocio no ha puesto la CLABE, se le pide
  escribir por WhatsApp.

- **Tarjeta, Google Pay o Apple Pay:** al tocar **Hacer pedido y pagar**
  va a la página de pago de Stripe (en español, con sus productos y el
  envío). Al terminar regresa a su pedido: "Estamos confirmando tu pago…"
  y, en segundos, "Recibimos tu pedido". Si se sale sin pagar, en su
  pedido tiene **Pagar $135**; si no paga en 1 hora, se cancela solo. Con
  envío manual, primero ve "en un momento te decimos el costo del envío";
  cuando la tienda lo pone, aparece el total y el botón para pagar. Si la
  tienda cancela un pedido ya pagado, ve "te regresamos el dinero a tu
  tarjeta".

## 4. Seguir el pedido

1. Su pedido vive en `/pedido/<token>` (sin cuenta). Ve **Pedido #12**
   en grande, si es mesa o para recoger, la hora si es programado y una
   barra: Recibido → Preparando → Listo (para recoger / va a tu mesa / en
   camino) → Entregado. La página se actualiza sola cada 10 segundos.
2. En el menú, durante 12 horas, aparece "Tu pedido #12: ver cómo va".
   También en **`/mis-pedidos`** (atajo "Mis pedidos" al dejar presionado
   el ícono de la app en Android), con los pedidos de las últimas 12 horas
   de ese celular.
3. **Cancelar:** botón "Cancelar pedido" solo mientras siga "Recibido" (y
   no se haya pagado con tarjeta).
   Después, por WhatsApp (botón con el número de pedido ya escrito).
4. Para recoger: dice su número y su nombre en el mostrador.

## 5. Instalar la app

1. En celular, el menú y la página del pedido muestran "Instala MW Café
   en tu celular…" con **Instalar** y una ×.
2. **Instalar:** en Android con Chrome sale el aviso del navegador; si no
   lo hay (iPhone siempre) o lo cierra, se abre la guía paso a paso con
   la pantalla simulada del celular.
3. La × lo oculta para siempre en ese celular (menú y pedido). La
   portada siempre tiene su sección "Instala la app".
4. La app instalada abre en el menú. En Android, al dejar presionado el
   ícono salen los atajos **Menú** y **Mis pedidos**.
