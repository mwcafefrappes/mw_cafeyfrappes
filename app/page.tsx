import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { business } from "@/lib/config/business";
import { getPublicBusinessSettings, getPublicLandingSections, getPublicMenu } from "@/lib/public-data";
import { getMenuPhotoUrl, getSiteAssetUrl } from "@/lib/storage";
import { productPriceLabel } from "@/lib/money";
import { parseTimeFormat } from "@/lib/time-format";
import { parseWeeklyHours, summarizeWeeklyHours } from "@/lib/weekly-hours";
import { appleMapsUrl, googleMapsDirectionsUrl, googleMapsEmbedUrl, MAX_FEATURED_PRODUCTS } from "@/lib/landing-content";
import { buildLocalBusinessJsonLd, jsonLdScript, resolveSiteBaseUrl } from "@/lib/seo";
import { AdminGestureListener } from "./AdminGestureListener";
import { CopyButton } from "./CopyButton";
import { InstallApp } from "./InstallApp";
import { OpenStatus } from "./OpenStatus";

// Título, descripción y vista previa al compartir salen de `generateMetadata`
// de `app/layout.tsx` (editables en /admin/negocio); aquí solo el canónico.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export const revalidate = 60;

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-on-primary transition-opacity hover:opacity-90";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-brand-ink/30 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-brand-sand";
const sectionHeading = "font-display text-[clamp(1.75rem,4.5vw,2.5rem)] font-semibold leading-tight";

export default async function HomePage() {
  const [settings, menu, sections] = await Promise.all([
    getPublicBusinessSettings(),
    getPublicMenu(),
    getPublicLandingSections(),
  ]);

  const hours = parseWeeklyHours(settings.weekly_hours);
  const timeFormat = parseTimeFormat(settings.time_format);
  const hoursLines = summarizeWeeklyHours(hours, timeFormat);
  const featured = menu
    .flatMap((category) => category.products)
    .filter((product) => product.show_on_landing)
    .slice(0, MAX_FEATURED_PRODUCTS);
  const siteUrl = resolveSiteBaseUrl(settings);
  const whatsappUrl = settings.business_whatsapp ? `https://wa.me/${settings.business_whatsapp}` : null;
  const hasCoords = settings.business_lat !== null && settings.business_lng !== null;
  const heroImage = getSiteAssetUrl(sections.hero.imagePath);
  const aboutImage = getSiteAssetUrl(sections.nosotros.imagePath);
  const logoUrl = getSiteAssetUrl(settings.logo_path);
  const serverNow = new Date().getTime();

  return (
    <div className="flex flex-1 flex-col bg-brand-cream text-brand-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(buildLocalBusinessJsonLd({ settings, siteUrl, logoUrl: logoUrl ?? `${siteUrl}/brand/icon-512.png` })),
        }}
      />
      <AdminGestureListener />

      {/* Barra fija */}
      <nav className="sticky top-0 z-40 border-b border-brand-border/60 bg-brand-cream/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image src="/brand/mw-logo-espresso.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0 dark:hidden" />
            <Image src="/brand/mw-logo-crema.png" alt="" width={36} height={36} className="hidden h-9 w-9 shrink-0 dark:block" />
            <span className="truncate font-display text-base font-semibold">{business.name}</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a href="#favoritos" className="hover:underline">
              Favoritos
            </a>
            <a href="#nosotros" className="hover:underline">
              Nosotros
            </a>
            <a href="#horario" className="hover:underline">
              Horario
            </a>
            <a href="#ubicacion" className="hover:underline">
              Ubicación
            </a>
          </div>
          <Link href="/menu" className={`${primaryButton} shrink-0 px-4 py-2`}>
            Ver menú
          </Link>
        </div>
      </nav>

      {/* Portada */}
      <section className="relative isolate overflow-hidden bg-[#1a120d]">
        {heroImage && (
          <>
            <Image src={heroImage} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/55 to-black/35" />
          </>
        )}
        <div className="mx-auto flex min-h-[78svh] max-w-6xl flex-col justify-end gap-6 px-4 pb-14 pt-24 text-[#fff7ec] sm:px-8 sm:pb-20">
          <OpenStatus hours={hours} timeFormat={timeFormat} serverNow={serverNow} className="self-start bg-black/45 backdrop-blur" />
          <div className="flex max-w-2xl flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#fff7ec]/80">
              Extensión de{" "}
              {settings.parent_store_instagram_url ? (
                <a href={settings.parent_store_instagram_url} className="underline decoration-1 underline-offset-4">
                  {settings.parent_store_name}
                </a>
              ) : (
                settings.parent_store_name
              )}
            </p>
            <h1 className="font-display text-[clamp(2.6rem,9vw,5rem)] font-bold leading-[1.02]">{sections.hero.heading}</h1>
            {sections.hero.subheading && <p className="max-w-xl text-base text-[#fff7ec]/85 sm:text-lg">{sections.hero.subheading}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-full bg-[#fff7ec] px-6 py-3 text-sm font-semibold text-[#2b1a12] transition-opacity hover:opacity-90"
            >
              Ver menú <span aria-hidden>→</span>
            </Link>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                className="inline-flex items-center gap-2 rounded-full border border-[#fff7ec]/50 px-6 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Favoritos */}
      {featured.length > 0 && (
        <section id="favoritos" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className={sectionHeading}>{sections.destacados.heading}</h2>
                {sections.destacados.subheading && (
                  <p className="mt-2 max-w-lg text-sm text-brand-ink/70">{sections.destacados.subheading}</p>
                )}
              </div>
              <Link href="/menu" className="text-sm font-semibold text-brand-accent underline-offset-4 hover:underline">
                Ver todo el menú →
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
              {featured.map((product) => {
                const photoUrl = getMenuPhotoUrl(product.photo_path);
                return (
                  <li key={product.id}>
                    <Link href={`/menu?producto=${product.slug}`} className="group flex flex-col gap-3">
                      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[16px] bg-brand-kraft">
                        {photoUrl ? (
                          <Image
                            src={photoUrl}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 30vw, 50vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="absolute inset-0 flex items-center justify-center font-display text-4xl font-bold text-brand-ink/20"
                          >
                            MW
                          </span>
                        )}
                        {!product.is_available && (
                          <span className="absolute left-2 top-2 rounded-full bg-brand-ink px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-cream">
                            Agotado
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                        <h3 className="font-semibold leading-snug group-hover:underline">{product.name}</h3>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-accent">
                          {productPriceLabel(product)}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Nosotros */}
      <section id="nosotros" className="scroll-mt-16 bg-brand-kraft">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-8 sm:py-20 md:grid-cols-2">
          {aboutImage && (
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[20px] md:order-2">
              <Image
                src={aboutImage}
                alt={`Barra de ${business.name}`}
                fill
                sizes="(min-width: 768px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          )}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink/60">{business.tagline}</p>
            <h2 className={sectionHeading}>{sections.nosotros.heading}</h2>
            {sections.nosotros.subheading && (
              <p className="text-base leading-relaxed text-brand-ink/80">{sections.nosotros.subheading}</p>
            )}
            {settings.parent_store_instagram_url && (
              <a href={settings.parent_store_instagram_url} className={`${secondaryButton} self-start`}>
                Conoce {settings.parent_store_name}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Horario y ubicación */}
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1.4fr]">
        <div id="horario" className="scroll-mt-20">
          <h2 className={sectionHeading}>{sections.horario.heading}</h2>
          {sections.horario.subheading && <p className="mt-2 text-sm text-brand-ink/70">{sections.horario.subheading}</p>}
          <OpenStatus hours={hours} timeFormat={timeFormat} serverNow={serverNow} className="mt-4 border border-brand-border" />
          <ul className="mt-5 flex flex-col gap-2">
            {hoursLines.length > 0 ? (
              hoursLines.map((line) => (
                <li key={line.days} className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-brand-border pb-2">
                  <span className="font-medium">{line.days}</span>
                  <span className="tabular-nums text-brand-ink/80">{line.hours}</span>
                </li>
              ))
            ) : (
              <li className="text-brand-ink/70">Pregúntanos el horario por WhatsApp.</li>
            )}
          </ul>
        </div>

        <div id="ubicacion" className="scroll-mt-20">
          <h2 className={sectionHeading}>{sections.ubicacion.heading}</h2>
          {sections.ubicacion.subheading && <p className="mt-2 text-sm text-brand-ink/70">{sections.ubicacion.subheading}</p>}
          {settings.business_address && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-base">{settings.business_address}</p>
              <CopyButton value={settings.business_address} label="Copiar" />
            </div>
          )}
          {hasCoords && (
            <>
              <div className="mt-5 overflow-hidden rounded-[16px] border border-brand-border">
                <iframe
                  title={`Mapa de ${business.name}`}
                  src={googleMapsEmbedUrl(settings.business_lat!, settings.business_lng!)}
                  className="h-64 w-full border-0 sm:h-72"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={googleMapsDirectionsUrl(settings.business_lat!, settings.business_lng!)} className={primaryButton}>
                  Cómo llegar
                </a>
                <a href={appleMapsUrl(settings.business_lat!, settings.business_lng!, business.name)} className={secondaryButton}>
                  Apple Maps
                </a>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Contacto */}
      <section className="bg-brand-primary text-brand-on-primary">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className={sectionHeading}>{sections.contacto.heading}</h2>
            {sections.contacto.subheading && <p className="mt-2 max-w-md text-sm opacity-85">{sections.contacto.subheading}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                className="inline-flex items-center rounded-full bg-brand-on-primary px-5 py-2.5 text-sm font-semibold text-brand-primary transition-opacity hover:opacity-90"
              >
                WhatsApp
              </a>
            )}
            {settings.social_instagram_url && (
              <a
                href={settings.social_instagram_url}
                className="inline-flex items-center rounded-full border border-current px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
              >
                Instagram
              </a>
            )}
            {settings.social_facebook_url && (
              <a
                href={settings.social_facebook_url}
                className="inline-flex items-center rounded-full border border-current px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
              >
                Facebook
              </a>
            )}
          </div>
        </div>
      </section>

      <InstallApp iconUrl={logoUrl} />

      <footer className="border-t border-brand-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-6 text-xs text-brand-ink/70 sm:px-8">
          <p>
            © {new Date().getFullYear()} {business.name} · {business.tagline}
          </p>
          <nav className="flex flex-wrap gap-4">
            <Link href="/menu" className="underline underline-offset-4">
              Menú
            </Link>
            <Link href="/privacidad" className="underline underline-offset-4">
              Privacidad
            </Link>
            <Link href="/terminos" className="underline underline-offset-4">
              Términos
            </Link>
            <Link href="/eliminar-datos" className="underline underline-offset-4">
              Eliminar mis datos
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
