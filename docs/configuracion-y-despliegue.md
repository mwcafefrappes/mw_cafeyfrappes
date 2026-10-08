# Configuración y despliegue

> Creado 2026-10-06 (Fase 1).

## Desarrollo local

Requisitos: Node 24, pnpm 9, Docker Desktop encendido.

```bash
pnpm install
pnpm exec supabase start      # Supabase local en Docker (puertos 553xx, no chocan con Axel)
cp .env.example .env.local    # y pegar URL/llaves que imprime el comando anterior
pnpm dev                      # http://localhost:3000
```

- Studio local (ver tablas): http://127.0.0.1:55323
- Correos locales de Auth: http://127.0.0.1:55324
- `pnpm exec supabase db reset` vuelve a aplicar migraciones + seed.
- Después de cambiar una migración:
  `pnpm exec supabase gen types typescript --local > lib/database.types.ts`.

### Probar contra Supabase local (sin tocar producción)

Si `.env.local` tiene las llaves de producción:

```bash
node scripts/dev-local.mjs   # next dev con URL y llaves de `supabase status`
```

### Cuenta de `/admin` local

```bash
node --env-file=.env.local scripts/create-admin.mjs dev@mw.test
```

Imprime una contraseña temporal una sola vez.

## Producción

### 1. Supabase

1. Crear proyecto en https://supabase.com (plan Free, región `us-east-1`
   o la más cercana disponible). Idealmente con el correo del negocio
   (P1); si no, a nombre del desarrollador y se transfiere después.
2. Enlazar y subir el esquema:
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <ref>
   pnpm exec supabase db push --include-seed
   ```
3. En **Authentication → URL Configuration**: Site URL = URL de Vercel.
4. Crear las cuentas de `/admin` (Franco y desarrollador) con
   `scripts/create-admin.mjs` usando las llaves de producción en un
   `.env.production.local` temporal (no se commitea).

### Cambios de esquema después del primer deploy

Cada migración nueva en `supabase/migrations/` se sube a producción con
(sin `--include-seed`, para no tocar los datos reales):

```bash
pnpm exec supabase db push
```

Hacerlo **antes o junto** con el push del código que la usa. Ejemplo:
`20261008000000_table_count.sql` (número de mesas de `/admin/qr`, ya
aplicada el 2026-10-08) y `20261009000000_metric_counts.sql` (métricas).

### Repos

`origin` baja de `mauriciocastillo893/mw_cafeyfrappes` y sube a ese y a
`mwcafefrappes/mw_cafeyfrappes` (el del cliente) con un solo `git push`:

```bash
git remote set-url --add --push origin https://github.com/mauriciocastillo893/mw_cafeyfrappes.git
git remote set-url --add --push origin https://github.com/mwcafefrappes/mw_cafeyfrappes.git
```

Si un push falla en uno de los dos, el otro sí queda actualizado:
volver a correr `git push` cuando se arregle.

### 2. Vercel

1. **Add New → Project** → importar **`mwcafefrappes/mw_cafeyfrappes`** (el repo del cliente).
2. **Root Directory: dejarlo vacío** (la raíz del repo). El asistente
   puede proponer `app/` por la carpeta de rutas; eso rompe el build
   (lección de Axel Style).
3. Variables de entorno (Production y Preview):

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Igual (anon / publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Igual (service_role / secret). Nunca en el navegador |
| `APP_BASE_URL` | `https://<proyecto>.vercel.app`. Si falta, se usa el dominio de producción de Vercel (`VERCEL_PROJECT_PRODUCTION_URL`, requiere "System Environment Variables" activado); sin ninguno de los dos, el build falla al generar `/` |
| `CRON_SECRET` | Texto aleatorio largo (`openssl rand -hex 24`) |
| `STRIPE_SECRET_KEY` | Fase 6. Mientras no exista, `/admin/negocio` no deja activar domicilio ni tarjeta |

4. Activar **Analytics** en el proyecto de Vercel (se hace desde el
   dashboard, no desde el código).
5. El cron diario (`vercel.json` → `/api/cron/daily`) se registra solo
   al desplegar.

### 3. Después del primer deploy

- Poner la URL real en `/admin/negocio` (cuando exista; mientras, en
  `business_settings.site_url`) y en el Estudio QR.
- Probar `/`, `/admin/login`, `/privacidad`, `/terminos`.
