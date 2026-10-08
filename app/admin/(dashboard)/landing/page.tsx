import Link from "next/link";
import { requireAdminUser } from "@/lib/admin/auth";
import { getLandingAdmin } from "@/lib/admin/data";
import { saveLandingTextAction } from "@/lib/admin/landing-actions";
import { isLandingImageKey, LANDING_HEADING_MAX, LANDING_SUBHEADING_MAX } from "@/lib/admin/landing-form";
import { DEFAULT_LANDING_SECTIONS, LANDING_SECTION_KEYS, MAX_FEATURED_PRODUCTS, type LandingSectionKey } from "@/lib/landing-content";
import { getSiteAssetUrl } from "@/lib/storage";
import { cardClass, hintClass, inputClass, labelClass, primaryButtonClass } from "../ui";
import { LandingImageUploader } from "./LandingImageUploader";

export const dynamic = "force-dynamic";

const IMAGE_HINTS: Record<string, string> = {
  hero: "Va de fondo, a lo ancho, con el título encima: mejor horizontal y no muy saturada.",
  nosotros: "Una foto del local o del equipo. Se ajusta sola.",
};

const linkClass = "font-medium underline underline-offset-4";

/** Lo que cada sección toma de otras partes del panel. */
function SectionNote({ sectionKey, featuredNames }: { sectionKey: LandingSectionKey; featuredNames: string[] }) {
  switch (sectionKey) {
    case "destacados": {
      const shown = featuredNames.slice(0, MAX_FEATURED_PRODUCTS);
      const hidden = featuredNames.length - shown.length;
      return (
        <p className={hintClass}>
          {shown.length > 0 ? `Ahora: ${shown.join(", ")}.` : "No hay productos marcados; la sección no aparece."}
          {hidden > 0 && ` Hay ${hidden} más marcados que no caben (se muestran ${MAX_FEATURED_PRODUCTS}, en el orden del menú).`}{" "}
          Se eligen en{" "}
          <Link href="/admin/menu" className={linkClass}>
            Menú
          </Link>{" "}
          con &quot;Mostrar en los favoritos de la portada&quot;.
        </p>
      );
    }
    case "horario":
      return (
        <p className={hintClass}>
          Los días y horas se cambian en{" "}
          <Link href="/admin/horario" className={linkClass}>
            Horario
          </Link>
          .
        </p>
      );
    case "ubicacion":
      return (
        <p className={hintClass}>
          La dirección y el mapa se cambian en{" "}
          <Link href="/admin/negocio#ubicacion" className={linkClass}>
            Negocio
          </Link>
          .
        </p>
      );
    case "contacto":
      return (
        <p className={hintClass}>
          WhatsApp, Instagram y Facebook se cambian en{" "}
          <Link href="/admin/negocio#contacto" className={linkClass}>
            Negocio
          </Link>
          .
        </p>
      );
    default:
      return null;
  }
}

export default async function AdminLandingPage() {
  await requireAdminUser();
  const { rows, featuredNames } = await getLandingAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Portada</h1>
          <p className="mt-1 text-sm text-brand-ink/70">
            Textos y fotos de la página principal, en el orden en que aparecen. Si borras un texto, vuelve el original.
          </p>
        </div>
        <Link href="/" target="_blank" className="text-sm font-medium underline underline-offset-4">
          Ver la portada
        </Link>
      </div>

      {LANDING_SECTION_KEYS.map((key) => {
        const fallback = DEFAULT_LANDING_SECTIONS[key];
        const row = rows.get(key);
        const storedImage = row?.image_path ?? null;
        return (
          <section key={key} id={key} className={`${cardClass} flex scroll-mt-24 flex-col gap-4`}>
            <h2 className="font-display text-xl font-semibold">{fallback.label}</h2>
            {isLandingImageKey(key) && (
              <LandingImageUploader
                sectionKey={key}
                imageUrl={getSiteAssetUrl(storedImage ?? fallback.imagePath)}
                isCustom={Boolean(storedImage)}
                hint={IMAGE_HINTS[key]}
              />
            )}
            <form action={saveLandingTextAction} className="flex flex-col gap-4">
              <input type="hidden" name="key" value={key} />
              <label className={labelClass}>
                Título
                <input
                  name="heading"
                  defaultValue={row?.heading ?? fallback.heading}
                  placeholder={fallback.heading}
                  maxLength={LANDING_HEADING_MAX}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Texto
                <textarea
                  name="subheading"
                  defaultValue={row?.subheading ?? fallback.subheading}
                  placeholder={fallback.subheading || "Opcional"}
                  maxLength={LANDING_SUBHEADING_MAX}
                  rows={key === "hero" || key === "nosotros" ? 3 : 2}
                  className={inputClass}
                />
              </label>
              <SectionNote sectionKey={key} featuredNames={featuredNames} />
              <div className="flex justify-end">
                <button type="submit" className={primaryButtonClass}>
                  Guardar
                </button>
              </div>
            </form>
          </section>
        );
      })}
    </div>
  );
}
