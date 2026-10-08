/**
 * Contenido editable de la landing (`landing_sections`, se edita en
 * /admin/landing en la Fase 4): título, subtítulo e imagen opcional por
 * sección. Solo texto e imagen; el diseño de cada sección sigue fijo en
 * `app/page.tsx`. Si falta una fila o un campo, se usa el valor de aquí
 * (mismo patrón que Axel Style).
 *
 * Los textos por defecto los propuso el desarrollador (2026-10-08) y
 * están pendientes de que Franco los revise.
 */

/** Máximo de favoritos en la portada (en el orden del menú); el resto se ve en /menu. */
export const MAX_FEATURED_PRODUCTS = 6;

export const LANDING_SECTION_KEYS = ["hero", "destacados", "nosotros", "horario", "ubicacion", "contacto"] as const;
export type LandingSectionKey = (typeof LANDING_SECTION_KEYS)[number];

export interface LandingSectionDefault {
  /** Nombre de la sección en /admin/landing. */
  label: string;
  heading: string;
  subheading: string;
  /** Imagen de respaldo (`public/`); `null` = la sección no lleva imagen por defecto. */
  imagePath: string | null;
}

export const DEFAULT_LANDING_SECTIONS: Record<LandingSectionKey, LandingSectionDefault> = {
  hero: {
    label: "Encabezado",
    heading: "Café, frappés y waffles",
    subheading: "Café de grano, frappés bien fríos, crepas, sodas italianas y los waffles de siempre, en Sector K, Huatulco.",
    imagePath: "/sample/local-terraza.jpg",
  },
  destacados: {
    label: "Favoritos",
    heading: "Los favoritos de la casa",
    subheading: "Lo que más se pide. Toca uno para ver tamaños y extras.",
    imagePath: null,
  },
  nosotros: {
    label: "Quiénes somos",
    heading: "Somos parte de Mundo Waffle",
    subheading:
      "MW Café & Frappés es la extensión de Mundo Waffle Huatulco: los mismos waffles que ya conoces, ahora con café, frappés y un espacio tranquilo para platicar por la noche.",
    imagePath: "/sample/local-barra.jpg",
  },
  horario: {
    label: "Horario",
    heading: "Horario",
    subheading: "Te esperamos por la noche.",
    imagePath: null,
  },
  ubicacion: {
    label: "Ubicación",
    heading: "Dónde estamos",
    subheading: "",
    imagePath: null,
  },
  contacto: {
    label: "Contacto",
    heading: "¿Dudas o pedidos especiales?",
    subheading: "Escríbenos por WhatsApp o síguenos en redes para ver lo nuevo.",
    imagePath: null,
  },
};

export interface LandingSection {
  key: LandingSectionKey;
  heading: string;
  subheading: string;
  imagePath: string | null;
}

interface StoredLandingSection {
  key: string;
  heading: string | null;
  subheading: string | null;
  image_path: string | null;
}

/** Junta lo guardado en la BD con los valores por defecto. Un campo vacío ("") cuenta como "usar el de por defecto". */
export function resolveLandingSections(rows: StoredLandingSection[]): Record<LandingSectionKey, LandingSection> {
  const stored = new Map(rows.map((row) => [row.key, row]));
  return Object.fromEntries(
    LANDING_SECTION_KEYS.map((key) => {
      const row = stored.get(key);
      const fallback = DEFAULT_LANDING_SECTIONS[key];
      return [
        key,
        {
          key,
          heading: row?.heading?.trim() || fallback.heading,
          subheading: row?.subheading?.trim() || fallback.subheading,
          imagePath: row?.image_path || fallback.imagePath,
        },
      ];
    })
  ) as Record<LandingSectionKey, LandingSection>;
}

export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function appleMapsUrl(lat: number, lng: number, name: string): string {
  const params = new URLSearchParams({ daddr: `${lat},${lng}`, q: name });
  return `https://maps.apple.com/?${params.toString()}`;
}

/** Mapa embebido de Google sin llave de API. */
export function googleMapsEmbedUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
}
