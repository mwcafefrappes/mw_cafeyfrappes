/**
 * Lo único del negocio que NO vive en la base de datos ni es editable
 * desde /admin: identidad fija de la marca y variables de entorno.
 *
 * Horario, menú, datos de contacto, reglas de pedidos y métodos de pago
 * viven en `business_settings` y en las tablas del menú (editables en
 * /admin) — no se duplican aquí.
 */

export const business = {
  name: "MW Café & Frappés",
  shortName: "MW Café",
  tagline: "Universo de sabor",
  /**
   * Responsable legal para /privacidad y /terminos. MW no es una empresa
   * constituida; por ahora se asume a Franco García como persona física
   * (pendiente P13 de CLAUDE.md). La dirección es la de Instagram
   * (decisión 2026-10-06; la que se muestra en el sitio se edita en
   * /admin). Sin correo todavía (P1): el contacto es el WhatsApp.
   */
  legalResponsibleName: "Franco García",
  legalAddress: "Sector K, sobre la calle boulevard Guelaguetza, Huatulco, Oaxaca",
  legalContactEmail: null as string | null,
  legalContactWhatsapp: "958 186 1260",
  city: "Santa María Huatulco",
  region: "Oaxaca",
} as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const env = {
  /** Sin `APP_BASE_URL`, el dominio de producción que Vercel da solo (variables de sistema). */
  get appBaseUrl() {
    const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (!process.env.APP_BASE_URL && vercelUrl) return `https://${vercelUrl}`;
    return requireEnv("APP_BASE_URL");
  },
  get supabaseUrl() {
    return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
  get cronSecret() {
    return requireEnv("CRON_SECRET");
  },
  /** El cobro con tarjeta (Stripe, Fase 6) existe solo si hay llave. Sin ella, ni domicilio ni tarjeta se pueden activar. */
  get stripeReady() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  },
};

/** `business_settings.site_url` (editable en /admin) con `APP_BASE_URL` de respaldo. */
export function getSiteUrl(settings: { site_url: string | null }): string {
  return settings.site_url ?? env.appBaseUrl;
}
