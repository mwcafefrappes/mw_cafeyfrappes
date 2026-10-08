# Qué cambiaría al clonar este proyecto para otro cliente

> Regla 10 de `CLAUDE.md`: se agrega una entrada en el mismo cambio que
> introduzca algo específico de MW fuera de la BD, `lib/config/business.ts`
> o variables de entorno.

## Fase 1

- **Marca:** tokens `--brand-*` de `app/globals.css` (claro y oscuro),
  fuentes en `app/layout.tsx` (Figtree + Playfair Display) y los
  archivos de `public/brand/` y `public/favicon.ico`. Los nombres de los
  tokens son por función, así que los componentes no cambian.
- **Colores fijos fuera de tokens:** `app/manifest.ts`
  (`background_color`, `theme_color`) y `viewport.themeColor` en
  `app/layout.tsx`.
- **Valores por defecto de `business_settings`** en la migración inicial
  (nombre, dirección, coordenadas, redes, WhatsApp, horario jue–dom).
- **Seed** `supabase/seed/mw-cafe.sql` y fotos de `public/sample/`.
- **Páginas legales:** redactadas para persona física con pedidos y
  pagos en línea; textos de Mundo Waffle en `/terminos`.
- **`InstallGuideModal.tsx`:** dominio de respaldo
  `mw-cafeyfrappes.vercel.app` para el render del servidor.
- **`supabase/config.toml`:** `project_id` y puertos 553xx (para que no
  choquen con Supabase local de otros clientes).
- **`app/admin/(dashboard)/qr/`:** logo del centro del QR
  (`/brand/mw-logo-espresso.png`), colores de los presets ("Espresso",
  "Noche MW"…) y textos por defecto de la tarjeta en `page.tsx`.
- **`lib/landing-content.ts`:** textos por defecto de la landing
  ("Somos parte de Mundo Waffle"…) e imágenes de respaldo de `public/sample`.
- **`app/page.tsx`:** etiqueta "Extensión de …" y botón "Conoce …"
  (salen de `parent_store_*` en la BD; quitar si el cliente no tiene tienda principal).
