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
curl -i -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/daily   # 200 {"ok":true}
```

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
